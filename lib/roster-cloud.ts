import { getTenantClients } from "@/lib/client-records";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { saveRosterShifts, type RosterShift, type RosterStatus } from "@/lib/roster";
import { getTenantStaffInvites } from "@/lib/staff-records";
import { supabaseRequest, supabaseRpc } from "@/lib/supabase-rest";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";

type ShiftRow = {
  id: string;
  participant_id: string;
  title: string | null;
  support_type: string | null;
  location: string | null;
  service_location_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  shift_instructions: string | null;
  staffing_ratio: string | null;
  note_required: boolean;
  note_completed: boolean;
  source_roster_shift_id: string | null;
};

type AssignmentRow = {
  shift_id: string;
  staff_user_id: string | null;
  staff_invite_id: string | null;
};

const statusMap: Record<string, RosterStatus> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  note_required: "Note Required",
  note_completed: "Note Completed",
  cancelled: "Cancelled",
  no_show: "No Show"
};

export async function loadTenantRosterShifts() {
  if (isPresentationModeEnabled()) return { shifts: [] as RosterShift[], error: "" };

  const [shiftResult, assignmentResult, clients, staff] = await Promise.all([
    supabaseRequest<ShiftRow[]>("support_shifts", {
      query: "select=id,participant_id,title,support_type,location,service_location_id,start_time,end_time,status,shift_instructions,staffing_ratio,note_required,note_completed,source_roster_shift_id&order=start_time.asc"
    }),
    supabaseRequest<AssignmentRow[]>("shift_staff", {
      query: "select=shift_id,staff_user_id,staff_invite_id"
    }),
    getTenantClients(),
    getTenantStaffInvites()
  ]);

  if (shiftResult.error || !shiftResult.data) {
    return { shifts: [] as RosterShift[], error: "The roster could not be loaded from the workspace." };
  }

  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const staffNames = new Map(staff.map((worker) => [worker.id, worker.name]));
  const assignmentsByShift = new Map<string, Array<{ id: string; name: string }>>();

  for (const assignment of assignmentResult.data || []) {
    const workerId = assignment.staff_invite_id || assignment.staff_user_id || "";
    if (!workerId) continue;
    const workers = assignmentsByShift.get(assignment.shift_id) || [];
    workers.push({ id: workerId, name: staffNames.get(workerId) || "Assigned staff" });
    assignmentsByShift.set(assignment.shift_id, workers);
  }

  const shifts = shiftResult.data
    .filter((row) => !row.source_roster_shift_id || row.source_roster_shift_id === row.id)
    .map((row): RosterShift => {
      const workers = assignmentsByShift.get(row.id) || [];
      const firstWorker = workers[0] || { id: "", name: "Unassigned" };
      return {
        id: row.id,
        participantId: row.participant_id,
        participantName: clientsById.get(row.participant_id)?.name || "Client",
        participantPhotoPath: clientsById.get(row.participant_id)?.profilePhotoPath,
        workerId: firstWorker.id,
        workerName: firstWorker.name,
        assignedWorkers: workers,
        staffingRatio: row.staffing_ratio || "1:1",
        supportType: row.support_type || row.title || "Support shift",
        shiftDate: formatSydneyDate(row.start_time),
        startTime: formatSydneyTime(row.start_time),
        endTime: formatSydneyTime(row.end_time),
        location: row.location || "",
        serviceLocationId: row.service_location_id || undefined,
        serviceLocationName: row.service_location_id ? row.location || "Service location" : undefined,
        shiftInstructions: row.shift_instructions || "",
        status: statusMap[row.status] || "Scheduled",
        noteRequired: row.note_required,
        noteCompleted: row.note_completed
      };
    });

  saveRosterShifts(shifts);
  return { shifts, error: assignmentResult.error ? "Roster shifts loaded. Staff assignments may need refreshing." : "" };
}

export async function saveTenantRosterShift(shift: RosterShift) {
  const apiResult = await saveRosterShiftViaApi(shift);
  if (apiResult.savedToCloud || apiResult.error !== "api_unavailable") return apiResult;

  const result = await supabaseRpc<string>("save_roster_shift_with_service_location", {
    roster_shift_id: shift.id,
    roster_participant_id: shift.participantId,
    roster_title: `${shift.participantName} - ${shift.supportType}`,
    roster_support_type: shift.supportType,
    roster_location: shift.location,
    roster_shift_date: shift.shiftDate,
    roster_start_time: shift.startTime,
    roster_end_time: shift.endTime,
    roster_status: shift.status,
    roster_shift_instructions: shift.shiftInstructions,
    roster_staffing_ratio: shift.staffingRatio || "1:1",
    roster_note_required: shift.noteRequired,
    roster_note_completed: shift.noteCompleted,
    roster_assignments: (shift.assignedWorkers?.length ? shift.assignedWorkers : [{ id: shift.workerId, name: shift.workerName }]).filter((worker) => worker.id).map((worker) => ({
      workerId: worker.id,
      role: "assigned worker"
    })),
    roster_service_location_id: shift.serviceLocationId || null
  }, { write: true });

  return {
    savedToCloud: !result.error,
    error: result.error || ""
  };
}

async function saveRosterShiftViaApi(shift: RosterShift) {
  try {
    const response = await fetch("/api/roster/shifts", {
      method: "POST",
      headers: getAuthenticatedApiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(shift),
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) return { savedToCloud: false, error: result.error || "New shift could not be saved." };
    return { savedToCloud: true, error: "" };
  } catch {
    return { savedToCloud: false, error: "api_unavailable" };
  }
}

function formatSydneyDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function formatSydneyTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
}
