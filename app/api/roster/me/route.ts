import { NextResponse } from "next/server";
import { resolveUserAccessContext } from "@/lib/security/user-access-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AssignmentRow = { shift_id: string; staff_user_id: string | null; staff_invite_id: string | null };
type InviteIdentityRow = { id: string; email?: string | null };
type AcceptedInviteIdentityRow = { staff_invite_id: string | null };
type UserRow = { id: string; email: string | null };
type ShiftRow = {
  id: string; participant_id: string; title: string | null; support_type: string | null; location: string | null;
  start_time: string; end_time: string; status: string; shift_instructions: string | null; staffing_ratio: string | null;
  note_required: boolean; note_completed: boolean;
  actual_start_time: string | null; actual_end_time: string | null; shift_signoff_status: string | null; shift_signoff_note: string | null;
};

export async function GET(request: Request) {
  const resolved = await resolveUserAccessContext(request);
  if (!resolved.context) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Personal roster access is not configured." }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const from = validDate(params.get("from"));
  const to = validDate(params.get("to"));
  if (!from || !to || from > to || daysBetween(from, to) > 62) {
    return NextResponse.json({ error: "Choose a valid roster period of up to 62 days." }, { status: 400 });
  }

  const context = resolved.context;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  // Query a one-day UTC buffer, then enforce the requested period using Sydney calendar dates.
  // This avoids dropping early shifts when daylight-saving changes the local UTC offset.
  const fromIso = `${addDays(from, -1)}T00:00:00Z`;
  const toIso = `${addDays(to, 2)}T00:00:00Z`;
  const candidateShifts = await getRows<ShiftRow>(url, headers, `support_shifts?select=id,participant_id,title,support_type,location,start_time,end_time,status,shift_instructions,staffing_ratio,note_required,note_completed,actual_start_time,actual_end_time,shift_signoff_status,shift_signoff_note&organisation_id=eq.${context.organisationId}&start_time=gte.${encodeURIComponent(fromIso)}&start_time=lt.${encodeURIComponent(toIso)}&order=start_time.asc`);
  const shifts = candidateShifts.filter((row) => {
    const shiftDate = sydneyPart(row.start_time, "date");
    return shiftDate >= from && shiftDate <= to;
  });
  if (!shifts.length) return NextResponse.json({ shifts: [], worker: { name: context.email.split("@")[0] } });

  const shiftIds = shifts.map((row) => row.id);
  const assignments = await getRows<AssignmentRow>(url, headers, `shift_staff?select=shift_id,staff_user_id,staff_invite_id&organisation_id=eq.${context.organisationId}&shift_id=in.(${csvIn(shiftIds)})`);
  if (!assignments.length) return NextResponse.json({ shifts: [], worker: { name: context.email.split("@")[0] } });

  const emailInviteRows = context.email
    ? await getRows<InviteIdentityRow>(url, headers, `staff_invites?select=id,email&organisation_id=eq.${context.organisationId}&email=ilike.${encodeURIComponent(context.email)}&invite_status=neq.Suspended`)
    : [];
  const acceptedInviteRows = await getRows<AcceptedInviteIdentityRow>(url, headers, `organisation_invites?select=staff_invite_id&organisation_id=eq.${context.organisationId}&auth_user_id=eq.${context.userId}&status=eq.accepted`);
  const assignedInviteIds = [...new Set(assignments.map((row) => row.staff_invite_id || "").filter(Boolean))];
  const assignedUserIds = [...new Set(assignments.map((row) => row.staff_user_id || "").filter(Boolean))];
  const [assignedInvites, assignedUsers] = await Promise.all([
    assignedInviteIds.length ? getRows<InviteIdentityRow>(url, headers, `staff_invites?select=id,email&organisation_id=eq.${context.organisationId}&id=in.(${csvIn(assignedInviteIds)})`) : Promise.resolve([]),
    assignedUserIds.length ? getRows<UserRow>(url, headers, `users?select=id,email&organisation_id=eq.${context.organisationId}&id=in.(${csvIn(assignedUserIds)})`) : Promise.resolve([])
  ]);

  const workerEmail = context.email.trim().toLowerCase();
  const inviteIds = new Set([
    ...emailInviteRows.map((row) => row.id),
    ...acceptedInviteRows.map((row) => row.staff_invite_id || "").filter(Boolean)
  ]);
  for (const invite of assignedInvites) {
    if (invite.email?.trim().toLowerCase() === workerEmail) inviteIds.add(invite.id);
  }
  const userIds = new Set([context.userId]);
  for (const user of assignedUsers) {
    if (user.email?.trim().toLowerCase() === workerEmail) userIds.add(user.id);
  }
  const workerShiftIds = new Set(assignments
    .filter((assignment) =>
      Boolean(assignment.staff_user_id && userIds.has(assignment.staff_user_id)) ||
      Boolean(assignment.staff_invite_id && inviteIds.has(assignment.staff_invite_id))
    )
    .map((assignment) => assignment.shift_id));
  const workerShifts = shifts.filter((row) => workerShiftIds.has(row.id));
  if (!workerShifts.length) return NextResponse.json({ shifts: [], worker: { name: context.email.split("@")[0] } });

  const participantIds = [...new Set(shifts.map((row) => row.participant_id))];
  const participants = participantIds.length
    ? await getRows<{ id: string; name: string; preferred_name: string | null }>(url, headers, `participants_or_clients?select=id,name,preferred_name&organisation_id=eq.${context.organisationId}&id=in.(${participantIds.join(",")})`)
    : [];
  const names = new Map(participants.map((row) => [row.id, row.preferred_name || row.name]));

  return NextResponse.json({
    worker: { name: context.email.split("@")[0] },
    shifts: workerShifts.map((row) => ({
      id: row.id,
      participantId: row.participant_id,
      participantName: names.get(row.participant_id) || "Client",
      supportType: row.support_type || row.title || "Support shift",
      location: row.location || "",
      shiftDate: sydneyPart(row.start_time, "date"),
      startTime: sydneyPart(row.start_time, "time"),
      endTime: sydneyPart(row.end_time, "time"),
      shiftInstructions: row.shift_instructions || "",
      staffingRatio: row.staffing_ratio || "1:1",
      status: normaliseStatus(row.status),
      noteRequired: row.note_required,
      noteCompleted: row.note_completed,
      actualStartTime: row.actual_start_time ? sydneyPart(row.actual_start_time, "time") : undefined,
      actualEndTime: row.actual_end_time ? sydneyPart(row.actual_end_time, "time") : undefined,
      shiftSignOffStatus: normaliseSignOffStatus(row.shift_signoff_status),
      shiftSignOffNote: row.shift_signoff_note || undefined
    }))
  });
}

async function getRows<T>(url: string, headers: Record<string, string>, path: string): Promise<T[]> {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Personal roster query failed (${response.status}).`);
  return response.json() as Promise<T[]>;
}

function validDate(value: string | null) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""; }
function daysBetween(from: string, to: string) { return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000); }
function addDays(value: string, amount: number) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); }
function csvIn(values: string[]) { return values.map((value) => encodeURIComponent(value)).join(","); }
function sydneyPart(value: string, part: "date" | "time") { return new Intl.DateTimeFormat(part === "date" ? "en-CA" : "en-AU", part === "date" ? { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" } : { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)); }
function normaliseStatus(value: string) { return value.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }
function normaliseSignOffStatus(value: string | null) { if (value === "started") return "Started"; if (value === "finished") return "Finished"; if (value === "approved") return "Approved"; return undefined; }
