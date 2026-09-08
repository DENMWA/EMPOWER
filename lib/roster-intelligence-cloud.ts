import { supabaseRequest, supabaseRpc } from "@/lib/supabase-rest";
import type { AvailabilityKind, StaffAvailability } from "@/lib/roster-intelligence";

type AvailabilityRow = {
  id: string; staff_invite_id: string; weekday: number | null; specific_date: string | null;
  start_time: string; end_time: string; availability_kind: AvailabilityKind; recurring: boolean; notes: string | null;
};

export async function loadStaffAvailability() {
  const result = await supabaseRequest<AvailabilityRow[]>("staff_availability", {
    query: "select=id,staff_invite_id,weekday,specific_date,start_time,end_time,availability_kind,recurring,notes&order=specific_date.asc,weekday.asc,start_time.asc"
  });
  return {
    records: (result.data || []).map(toAvailability),
    error: result.error || ""
  };
}

export async function saveStaffAvailability(record: StaffAvailability) {
  const result = await supabaseRpc<string>("save_staff_availability", {
    availability_id: record.id,
    availability_staff_invite_id: record.staffInviteId,
    availability_weekday: record.weekday,
    availability_specific_date: record.specificDate,
    availability_start_time: record.startTime,
    availability_end_time: record.endTime,
    availability_kind: record.kind,
    availability_recurring: record.recurring,
    availability_notes: record.notes
  }, { write: true });
  return { saved: Boolean(result.data && !result.error), record: result.data ? record : null, error: result.error || "" };
}

export type WeeklyGridEntry = { weekday: number; startTime: string; endTime: string; kind: AvailabilityKind };

// Replaces a staff member's entire recurring weekly pattern in one call —
// pass every day that should have a state; any day left out is cleared.
export async function saveWeeklyAvailabilityGrid(staffInviteId: string, grid: WeeklyGridEntry[]) {
  const result = await supabaseRpc<null>("save_weekly_availability_grid", {
    target_staff_invite_id: staffInviteId,
    grid: grid.map((entry) => ({ weekday: entry.weekday, startTime: entry.startTime, endTime: entry.endTime, kind: entry.kind }))
  }, { write: true });
  return { saved: !result.error, error: result.error || "" };
}

function toAvailability(row: AvailabilityRow): StaffAvailability {
  return {
    id: row.id,
    staffInviteId: row.staff_invite_id,
    weekday: row.weekday,
    specificDate: row.specific_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    kind: row.availability_kind,
    recurring: row.recurring,
    notes: row.notes || ""
  };
}
