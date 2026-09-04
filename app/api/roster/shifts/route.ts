import { NextResponse } from "next/server";
import { verifyServerAccess } from "@/lib/security/server-access";
import type { RosterShift, RosterStatus } from "@/lib/roster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedStatuses: Record<RosterStatus, string> = {
  Scheduled: "scheduled",
  "In Progress": "in_progress",
  Completed: "completed",
  "Note Required": "note_required",
  "Note Completed": "note_completed",
  Cancelled: "cancelled",
  "No Show": "no_show"
};
const unavailableStaffStatuses = new Set(["on leave", "resigned", "terminated", "suspended"]);
const signOffStatuses = {
  "Not started": "not_started",
  Started: "started",
  Finished: "finished",
  Approved: "approved"
} as const;

export async function POST(request: Request) {
  const access = await verifyServerAccess(request, "admin", "scheduling", "rostering.manage");
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: access.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Roster saving is not configured." }, { status: 503 });

  const shift = await request.json().catch(() => null) as RosterShift | null;
  const validationError = validateShift(shift);
  if (validationError || !shift) return NextResponse.json({ error: validationError || "Shift details are required." }, { status: 400 });

  const headers = serviceHeaders(key);
  const [client] = await rows<{ id: string; name: string }>(url, headers, `participants_or_clients?select=id,name&id=eq.${encodeURIComponent(shift.participantId)}&organisation_id=eq.${access.organisationId}&limit=1`);
  if (!client) return NextResponse.json({ error: "The selected client was not found in this organisation." }, { status: 404 });

  if (shift.serviceLocationId) {
    const [location] = await rows<{ id: string }>(url, headers, `service_locations?select=id&id=eq.${encodeURIComponent(shift.serviceLocationId)}&organisation_id=eq.${access.organisationId}&status=eq.active&limit=1`);
    if (!location) return NextResponse.json({ error: "The selected house or service location is not active." }, { status: 404 });
  }

  const assignedWorkers = (shift.assignedWorkers?.length ? shift.assignedWorkers : [{ id: shift.workerId, name: shift.workerName }]).filter((worker) => worker.id);
  const resolvedAssignments = await resolveAssignedStaff(url, headers, access.organisationId, assignedWorkers);
  if (resolvedAssignments.error) return NextResponse.json({ error: resolvedAssignments.error }, { status: 404 });

  const saved = await upsertShift(url, headers, access, shift);
  if (!saved.ok) return databaseError(saved, "The roster shift could not be saved.");

  const assignmentWarnings: string[] = [];
  const deleted = await fetch(`${url}/rest/v1/shift_staff?organisation_id=eq.${access.organisationId}&shift_id=eq.${encodeURIComponent(shift.id)}`, {
    method: "DELETE",
    headers,
    cache: "no-store"
  });
  if (!deleted.ok) {
    assignmentWarnings.push(await databaseWarning(deleted, "Existing roster assignments could not be refreshed."));
  }

  if (deleted.ok && resolvedAssignments.assignments.length) {
    const assignments = resolvedAssignments.assignments.map((worker) => ({
      organisation_id: access.organisationId,
      shift_id: shift.id,
      staff_user_id: worker.staffUserId,
      staff_invite_id: worker.staffInviteId,
      role: "assigned worker",
      status: shift.status === "Completed" ? "completed" : "assigned"
    }));
    const written = await fetch(`${url}/rest/v1/shift_staff`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(assignments),
      cache: "no-store"
    });
    if (!written.ok) {
      const linkedAssignments = assignments.filter((assignment) => assignment.staff_user_id);
      if (linkedAssignments.length && linkedAssignments.length < assignments.length) {
        const retry = await fetch(`${url}/rest/v1/shift_staff`, {
          method: "POST",
          headers: { ...headers, Prefer: "return=representation" },
          body: JSON.stringify(linkedAssignments),
          cache: "no-store"
        });
        if (!retry.ok) assignmentWarnings.push(await databaseWarning(retry, "Roster staff assignments could not be saved."));
        else assignmentWarnings.push("Some invited staff are not linked to signed-in accounts yet.");
      } else {
        assignmentWarnings.push(await databaseWarning(written, "Roster staff assignments could not be saved."));
      }
    }
  }

  return NextResponse.json({ ok: true, id: shift.id, warning: assignmentWarnings.filter(Boolean).join(" ") });
}

type StaffInviteRow = { id: string; name: string; email: string; invite_status: string };
type UserRow = { id: string; email: string; name?: string | null };
type Access = Awaited<ReturnType<typeof verifyServerAccess>>;
type AssignedWorker = NonNullable<RosterShift["assignedWorkers"]>[number];
type ResolvedStaffAssignment = { staffInviteId: string | null; staffUserId: string | null };

async function resolveAssignedStaff(url: string, headers: Record<string, string>, organisationId: string, assignedWorkers: AssignedWorker[]) {
  if (!assignedWorkers.length) return { assignments: [] as ResolvedStaffAssignment[], error: "" };

  const workerIds = [...new Set(assignedWorkers.map((worker) => worker.id).filter(Boolean))];
  const staffByIdRows = await rows<StaffInviteRow>(url, headers, `staff_invites?select=id,name,email,invite_status&id=in.(${csvIn(workerIds)})&organisation_id=eq.${organisationId}`);
  const usersByIdRows = await rows<UserRow>(url, headers, `users?select=id,email,name&organisation_id=eq.${organisationId}&id=in.(${csvIn(workerIds)})`);
  const userEmails = usersByIdRows.map((user) => user.email.trim().toLowerCase()).filter(Boolean);
  const staffByUserEmailRows = userEmails.length
    ? await rows<StaffInviteRow>(url, headers, `staff_invites?select=id,name,email,invite_status&organisation_id=eq.${organisationId}&email=in.(${csvIn(userEmails)})`)
    : [];
  const inviteEmails = staffByIdRows.map((worker) => worker.email.trim().toLowerCase()).filter(Boolean);
  const usersByInviteEmailRows = inviteEmails.length
    ? await rows<UserRow>(url, headers, `users?select=id,email,name&organisation_id=eq.${organisationId}&email=in.(${csvIn(inviteEmails)})`)
    : [];

  const staffById = new Map([...staffByIdRows, ...staffByUserEmailRows].map((worker) => [worker.id, worker]));
  const staffByEmail = new Map([...staffByIdRows, ...staffByUserEmailRows].map((worker) => [worker.email.trim().toLowerCase(), worker]));
  const usersById = new Map(usersByIdRows.map((user) => [user.id, user]));
  const usersByEmail = new Map([...usersByIdRows, ...usersByInviteEmailRows].map((user) => [user.email.trim().toLowerCase(), user]));

  const assignments = assignedWorkers.map((worker) => {
    const userById = usersById.get(worker.id);
    const staff = staffById.get(worker.id) || (userById ? staffByEmail.get(userById.email.trim().toLowerCase()) : undefined);
    const user = userById || (staff ? usersByEmail.get(staff.email.trim().toLowerCase()) : undefined);
    return { worker, staff, user };
  });

  const unavailable = assignments.find(({ staff, user }) => {
    if (!staff && !user) return true;
    return staff ? unavailableStaffStatuses.has(staff.invite_status.toLowerCase()) : false;
  });
  if (unavailable) return { assignments: [] as ResolvedStaffAssignment[], error: "One assigned staff member is unavailable in this organisation." };

  return {
    assignments: assignments
      .map(({ staff, user }) => ({ staffInviteId: staff?.id || null, staffUserId: user?.id || null }))
      .filter((assignment) => assignment.staffInviteId || assignment.staffUserId),
    error: ""
  };
}

function validateShift(shift: RosterShift | null) {
  if (!shift?.id || !shift.participantId) return "Choose a client before saving this roster shift.";
  if (!shift.shiftDate || !shift.startTime || !shift.endTime) return "Enter the shift date, start time and end time.";
  if (shift.endTime <= shift.startTime) return "Shift end time must be later than start time.";
  if (!shift.location?.trim()) return "Enter the service location.";
  if (!allowedStatuses[shift.status]) return "Choose a valid shift status.";
  return "";
}

async function upsertShift(url: string, headers: Record<string, string>, access: Access, shift: RosterShift) {
  return fetch(`${url}/rest/v1/support_shifts?on_conflict=id`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: shift.id,
      organisation_id: access.organisationId,
      participant_id: shift.participantId,
      title: `${shift.participantName} - ${shift.supportType}`,
      support_type: shift.supportType,
      location: shift.location,
      service_location_id: shift.serviceLocationId || null,
      start_time: toSydneyIso(shift.shiftDate, shift.startTime),
      end_time: toSydneyIso(shift.shiftDate, shift.endTime),
      timezone: "Australia/Sydney",
      status: allowedStatuses[shift.status],
      shift_instructions: shift.shiftInstructions,
      staffing_ratio: shift.staffingRatio || "1:1",
      note_required: shift.noteRequired,
      note_completed: shift.noteCompleted,
      actual_start_time: shift.actualStartTime ? toSydneyIso(shift.shiftDate, shift.actualStartTime) : null,
      actual_end_time: shift.actualEndTime ? toSydneyIso(shift.shiftDate, shift.actualEndTime) : null,
      shift_signoff_status: shift.shiftSignOffStatus ? signOffStatuses[shift.shiftSignOffStatus] : null,
      shift_signoff_note: shift.shiftSignOffNote || null,
      shift_signed_off_by: shift.shiftSignedOffBy || null,
      shift_approved_at: shift.shiftApprovedAt || null,
      shift_approved_by: shift.shiftSignOffStatus === "Approved" ? access.userId : shift.shiftApprovedBy || null,
      created_by: access.userId,
      updated_by: access.userId,
      updated_at: new Date().toISOString()
    }),
    cache: "no-store"
  });
}

function serviceHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function rows<T>(url: string, headers: Record<string, string>, path: string): Promise<T[]> {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" });
  return response.ok ? await response.json() as T[] : [];
}

function csvIn(values: string[]) {
  return values.map((value) => encodeURIComponent(value)).join(",");
}

async function databaseError(response: Response, fallback: string) {
  const detail = await response.text();
  console.error(fallback, response.status, detail);
  return NextResponse.json({ error: fallback }, { status: 502 });
}

async function databaseWarning(response: Response, fallback: string) {
  const detail = await response.text();
  console.warn(fallback, response.status, detail);
  return fallback;
}

function toSydneyIso(dateKey: string, time: string) {
  const desired = dateToDayNumber(dateKey) * 1440 + timeToMinutes(time);
  let candidate = new Date(`${dateKey}T${time}:00.000Z`);
  for (let index = 0; index < 3; index += 1) {
    const parts = sydneyParts(candidate);
    const actual = dateToDayNumber(parts.dateKey) * 1440 + timeToMinutes(parts.time);
    candidate = new Date(candidate.getTime() - (actual - desired) * 60_000);
  }
  return candidate.toISOString();
}

function sydneyParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { dateKey: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}

function dateToDayNumber(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}
