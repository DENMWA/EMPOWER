import { getShiftAssignedWorkers, getShiftDurationHours, type RosterShift } from "@/lib/roster";
import type { StaffRecord } from "@/lib/staff-records";

export type AvailabilityKind = "available" | "preferred" | "unavailable";

export type StaffAvailability = {
  id: string;
  staffInviteId: string;
  weekday: number | null;
  specificDate: string | null;
  startTime: string;
  endTime: string;
  kind: AvailabilityKind;
  recurring: boolean;
  notes: string;
};

export type RosterRecommendation = {
  staffId: string;
  staffName: string;
  eligible: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
};

export function recommendStaffForShift({
  shift,
  staff,
  availability,
  shifts
}: {
  shift: RosterShift;
  staff: StaffRecord[];
  availability: StaffAvailability[];
  shifts: RosterShift[];
}) {
  return staff.map((worker): RosterRecommendation => {
    const windows = availability.filter((item) => item.staffInviteId === worker.id && matchesDate(item, shift.shiftDate));
    const unavailable = windows.some((item) => item.kind === "unavailable" && overlaps(item.startTime, item.endTime, shift.startTime, shift.endTime));
    const covering = windows.find((item) => item.kind !== "unavailable" && covers(item.startTime, item.endTime, shift.startTime, shift.endTime));
    const conflict = shifts.some((item) => item.id !== shift.id && item.shiftDate === shift.shiftDate
      && !["Cancelled", "No Show"].includes(item.status)
      && getShiftAssignedWorkers(item).some((assigned) => assigned.id === worker.id)
      && overlaps(item.startTime, item.endTime, shift.startTime, shift.endTime));
    const assignedToClient = worker.assignedParticipants.includes(shift.participantId);
    const suspended = worker.inviteStatus === "Suspended";
    const eligible = !suspended && !unavailable && !conflict && Boolean(covering);
    const reasons = [
      covering ? covering.kind === "preferred" ? "Preferred availability covers the shift" : "Confirmed availability covers the shift" : "No covering availability recorded",
      assignedToClient ? "Already assigned to this client" : "Not currently assigned to this client"
    ];
    const warnings = [
      ...(suspended ? ["Staff access is suspended"] : []),
      ...(unavailable ? ["Marked unavailable"] : []),
      ...(conflict ? ["Overlaps another rostered shift"] : []),
      ...(!covering ? ["Availability must be confirmed"] : []),
      ...(!assignedToClient ? ["Manager must confirm client suitability"] : [])
    ];
    const score = Math.max(0, (covering ? 50 : 0) + (covering?.kind === "preferred" ? 15 : 0) + (assignedToClient ? 25 : 0) + (eligible ? 10 : 0));
    return { staffId: worker.id, staffName: worker.name, eligible, score, reasons, warnings };
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.staffName.localeCompare(b.staffName));
}

export function getAvailabilityHours(item: StaffAvailability) {
  return getShiftDurationHours(item.startTime, item.endTime);
}

function matchesDate(item: StaffAvailability, date: string) {
  if (item.specificDate) return item.specificDate === date;
  if (item.weekday === null) return false;
  return new Date(`${date}T00:00:00`).getDay() === item.weekday;
}

function covers(start: string, end: string, shiftStart: string, shiftEnd: string) {
  return start <= shiftStart && end >= shiftEnd;
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA;
}
