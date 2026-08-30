import { participants, supportTypes, users } from "@/lib/sample-data";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { tenantStorageKey } from "@/lib/tenant-storage";

export type RosterStatus = "Scheduled" | "In Progress" | "Completed" | "Note Required" | "Note Completed" | "Cancelled" | "No Show";
export type ShiftSignOffStatus = "Not started" | "Started" | "Finished" | "Approved";

export type RosterShift = {
  id: string;
  participantId: string;
  participantName: string;
  participantPhotoPath?: string;
  workerId: string;
  workerName: string;
  assignedWorkers?: Array<{ id: string; name: string }>;
  staffingRatio?: string;
  supportType: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  location: string;
  serviceLocationId?: string;
  serviceLocationName?: string;
  shiftInstructions: string;
  status: RosterStatus;
  noteRequired: boolean;
  noteCompleted: boolean;
  progressNoteId?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  shiftSignOffStatus?: ShiftSignOffStatus;
  shiftSignOffNote?: string;
  shiftSignedOffBy?: string;
  shiftApprovedAt?: string;
  shiftApprovedBy?: string;
};

export type RosterFilters = {
  workerId: string;
  serviceLocationId: string;
  status: string;
  noteState: string;
};

export type RosterReportPeriod = "weekly" | "fortnightly" | "monthly";
export type RosterPlanningView = "day" | "week" | "fortnight" | "month" | "quarter" | "year";

export type StaffHoursSummary = {
  workerId: string;
  workerName: string;
  completedShifts: number;
  totalHours: number;
  participantNames: string[];
  days: Array<{ date: string; shifts: number; hours: number }>;
};

export type EmployeeColourScheme = {
  key: string;
  label: string;
  border: string;
  bg: string;
  softBg: string;
  text: string;
  ring: string;
  dot: string;
};

export type RosterCoverageColour = {
  label: string;
  border: string;
  bg: string;
  softBg: string;
  text: string;
  dot: string;
};

const rosterCoverageColours: Record<"assigned" | "unassigned" | "vacant", RosterCoverageColour> = {
  assigned: {
    label: "Assigned",
    border: "border-sky-500",
    bg: "bg-sky-600",
    softBg: "bg-sky-50",
    text: "text-sky-950",
    dot: "bg-sky-500"
  },
  unassigned: {
    label: "Unassigned",
    border: "border-amber-400",
    bg: "bg-amber-500",
    softBg: "bg-amber-50",
    text: "text-amber-950",
    dot: "bg-amber-500"
  },
  vacant: {
    label: "Vacant / cancelled",
    border: "border-red-500",
    bg: "bg-red-600",
    softBg: "bg-red-50",
    text: "text-red-950",
    dot: "bg-red-500"
  }
};

const employeeColours: Record<string, EmployeeColourScheme> = {
  "support-worker-a": {
    key: "support-worker-a",
    label: "Worker A",
    border: "border-teal-500",
    bg: "bg-teal-600",
    softBg: "bg-teal-50",
    text: "text-teal-900",
    ring: "ring-teal-200",
    dot: "bg-teal-500"
  },
  "team-lead-a": {
    key: "team-lead-a",
    label: "Team Lead",
    border: "border-sky-500",
    bg: "bg-sky-600",
    softBg: "bg-sky-50",
    text: "text-sky-900",
    ring: "ring-sky-200",
    dot: "bg-sky-500"
  },
  "provider-owner": {
    key: "provider-owner",
    label: "Owner",
    border: "border-indigo-500",
    bg: "bg-indigo-600",
    softBg: "bg-indigo-50",
    text: "text-indigo-900",
    ring: "ring-indigo-200",
    dot: "bg-indigo-500"
  },
  "service-manager-a": {
    key: "service-manager-a",
    label: "Manager",
    border: "border-purple-500",
    bg: "bg-purple-600",
    softBg: "bg-purple-50",
    text: "text-purple-900",
    ring: "ring-purple-200",
    dot: "bg-purple-500"
  },
  default: {
    key: "default",
    label: "Default",
    border: "border-slate-400",
    bg: "bg-slate-600",
    softBg: "bg-slate-50",
    text: "text-slate-800",
    ring: "ring-slate-200",
    dot: "bg-slate-400"
  }
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

const today = addDays(0);
const tomorrow = addDays(1);
const thisWeek = addDays(2);

export const rosterStatuses: RosterStatus[] = ["Scheduled", "In Progress", "Completed", "Note Required", "Note Completed", "Cancelled", "No Show"];
const rosterStorageKey = "empowernotes:roster-shifts";
export const rosterUpdatedEvent = "empowernotes:roster-updated";

export const rosterShifts: RosterShift[] = [
  {
    id: "shift-001",
    participantId: "client-b",
    participantName: "Client B",
    workerId: "support-worker-a",
    workerName: "Support Worker A",
    supportType: "Community access",
    shiftDate: today,
    startTime: "10:00",
    endTime: "12:00",
    location: "Local shopping centre",
    shiftInstructions: "Use calm prompts, confirm shopping choices, and document any distress triggers.",
    status: "Note Required",
    noteRequired: true,
    noteCompleted: false
  },
  {
    id: "shift-002",
    participantId: "client-a",
    participantName: "Client A",
    workerId: "team-lead-a",
    workerName: "Team Lead A",
    supportType: "Personal care",
    shiftDate: today,
    startTime: "07:00",
    endTime: "09:00",
    location: "Home",
    shiftInstructions: "Follow the client's visual choices and allow processing time before each task.",
    status: "Note Completed",
    noteRequired: true,
    noteCompleted: true,
    progressNoteId: "note-002"
  },
  {
    id: "shift-003",
    participantId: "client-c",
    participantName: "Client C",
    workerId: "support-worker-a",
    workerName: "Support Worker A",
    supportType: "Behaviour support implementation",
    shiftDate: today,
    startTime: "15:00",
    endTime: "17:00",
    location: "SIL residence",
    shiftInstructions: "Record strategies used, the client's response, and any follow-up needed.",
    status: "Scheduled",
    noteRequired: true,
    noteCompleted: false
  },
  {
    id: "shift-004",
    participantId: "client-d",
    participantName: "Client D",
    workerId: "provider-owner",
    workerName: "Provider Owner",
    supportType: "Social work session",
    shiftDate: tomorrow,
    startTime: "13:00",
    endTime: "14:30",
    location: "Office / telehealth",
    shiftInstructions: "Confirm consent, key goals discussed, actions agreed, and next appointment plan.",
    status: "Scheduled",
    noteRequired: true,
    noteCompleted: false
  },
  {
    id: "shift-005",
    participantId: "client-b",
    participantName: "Client B",
    workerId: "service-manager-a",
    workerName: "Service Manager A",
    supportType: "Appointment support",
    shiftDate: thisWeek,
    startTime: "09:00",
    endTime: "11:00",
    location: "GP clinic",
    shiftInstructions: "Capture appointment outcome, recommendations, and any consented follow-up tasks.",
    status: "Completed",
    noteRequired: true,
    noteCompleted: true,
    progressNoteId: "note-001"
  }
];

export function getEmployeeColourScheme(workerId: string) {
  return employeeColours[workerId] ?? employeeColours.default;
}

export function getRosterCoverageColour(shift: RosterShift) {
  if (shift.status === "Cancelled" || shift.status === "No Show") return rosterCoverageColours.vacant;
  if (shift.workerName === "Vacant") return rosterCoverageColours.vacant;
  const assignedWorkers = getShiftAssignedWorkers(shift).filter((worker) => worker.id && worker.name && worker.name !== "Unassigned");
  if (!assignedWorkers.length) return rosterCoverageColours.unassigned;
  return rosterCoverageColours.assigned;
}

export function getRosterShifts() {
  return getStoredRosterShifts();
}

export function getStoredRosterShifts() {
  if (typeof window === "undefined") return rosterShifts;
  if (isPresentationModeEnabled()) return rosterShifts;
  try {
    const stored = window.sessionStorage.getItem(tenantStorageKey(rosterStorageKey));
    return stored ? JSON.parse(stored) as RosterShift[] : [];
  } catch {
    return [];
  }
}

export function saveRosterShifts(shifts: RosterShift[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(tenantStorageKey(rosterStorageKey), JSON.stringify(shifts));
  window.dispatchEvent(new Event(rosterUpdatedEvent));
}

export function getTodayRosterShifts(shifts: RosterShift[] = rosterShifts) {
  return shifts.filter((shift) => shift.shiftDate === today);
}

export function getWeekRosterShifts(shifts: RosterShift[] = rosterShifts, selectedDate = today) {
  const start = getWeekStart(selectedDate);
  const dates = Array.from({ length: 7 }, (_, index) => dateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)));
  return shifts.filter((shift) => dates.includes(shift.shiftDate));
}

export function getRosterRangeShifts(shifts: RosterShift[] = rosterShifts, selectedDate = today, view: RosterPlanningView = "week") {
  if (view === "day") return shifts.filter((shift) => shift.shiftDate === selectedDate);
  const range = getRosterPlanningRange(selectedDate, view);
  return shifts.filter((shift) => shift.shiftDate >= range.startKey && shift.shiftDate <= range.endKey);
}

export function getRosterSummary(shifts: RosterShift[] = rosterShifts) {
  const todayShifts = getTodayRosterShifts(shifts);
  return {
    todayCount: todayShifts.length,
    inProgress: shifts.filter((shift) => shift.status === "In Progress").length,
    completedNeedingNotes: shifts.filter((shift) => shift.status === "Completed" && shift.noteRequired && !shift.noteCompleted).length,
    cancelledOrNoShow: shifts.filter((shift) => shift.status === "Cancelled" || shift.status === "No Show").length
  };
}

export function getRosterReportSummary(shifts: RosterShift[] = rosterShifts, period: RosterReportPeriod = "weekly", selectedDate = today) {
  const range = getRosterReportRange(period, selectedDate);
  const inRange = shifts.filter((shift) => {
    const shiftDate = new Date(`${shift.shiftDate}T00:00:00`);
    return shiftDate >= range.start && shiftDate <= range.end;
  });

  return {
    period,
    label: range.label,
    dateRange: `${range.start.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} - ${range.end.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`,
    totalShifts: inRange.length,
    noteRequired: inRange.filter((shift) => shift.noteRequired).length,
    noteCompleted: inRange.filter((shift) => shift.noteCompleted).length,
    notesOutstanding: inRange.filter((shift) => shift.noteRequired && !shift.noteCompleted).length,
    completed: inRange.filter((shift) => shift.status === "Completed" || shift.status === "Note Completed").length,
    cancelledOrNoShow: inRange.filter((shift) => shift.status === "Cancelled" || shift.status === "No Show").length,
    statusCounts: rosterStatuses.map((status) => ({
      status,
      count: inRange.filter((shift) => shift.status === status).length
    }))
  };
}

export function filterRosterShifts(shifts: RosterShift[], filters: RosterFilters) {
  return shifts.filter((shift) => {
    const workerMatches = filters.workerId === "all" || shift.workerId === filters.workerId || Boolean(shift.assignedWorkers?.some((worker) => worker.id === filters.workerId));
    const locationMatches = filters.serviceLocationId === "all"
      || (filters.serviceLocationId === "flexible" ? !shift.serviceLocationId : shift.serviceLocationId === filters.serviceLocationId);
    const statusMatches = filters.status === "all" || shift.status === filters.status;
    const noteMatches =
      filters.noteState === "all" ||
      (filters.noteState === "required" && shift.noteRequired && !shift.noteCompleted) ||
      (filters.noteState === "completed" && shift.noteCompleted) ||
      (filters.noteState === "not-required" && !shift.noteRequired);
    return workerMatches && locationMatches && statusMatches && noteMatches;
  });
}

export function createRosterShift(input: Omit<RosterShift, "id" | "participantName" | "workerName"> & { participantName?: string; workerName?: string }) {
  const participant = participants.find((item) => item.id === input.participantId);
  const worker = users.find((item) => item.id === input.workerId);
  return {
    ...input,
    id: globalThis.crypto?.randomUUID?.() || `shift-${Date.now()}`,
    participantName: input.participantName || participant?.name || "Participant",
    workerName: input.workerName || worker?.name || "Worker"
  };
}

export function getStaffHoursSummary(shifts: RosterShift[], period: RosterReportPeriod, selectedDate: string) {
  const range = getRosterReportRange(period, selectedDate);
  const completedStatuses: RosterStatus[] = ["Completed", "Note Completed"];
  const staff = new Map<string, StaffHoursSummary>();

  shifts.filter((shift) => {
    const shiftDate = new Date(`${shift.shiftDate}T00:00:00`);
    return shiftDate >= range.start && shiftDate <= range.end && completedStatuses.includes(shift.status);
  }).forEach((shift) => {
    const hours = getShiftDurationHours(shift.startTime, shift.endTime);
    getShiftAssignedWorkers(shift).forEach((worker) => {
      if (!worker.id || !worker.name || worker.name === "Unassigned") return;
      const existing = staff.get(worker.id) || {
        workerId: worker.id,
        workerName: worker.name,
        completedShifts: 0,
        totalHours: 0,
        participantNames: [],
        days: []
      };
      existing.completedShifts += 1;
      existing.totalHours = Math.round((existing.totalHours + hours) * 100) / 100;
      if (!existing.participantNames.includes(shift.participantName)) existing.participantNames.push(shift.participantName);
      const day = existing.days.find((item) => item.date === shift.shiftDate);
      if (day) {
        day.shifts += 1;
        day.hours = Math.round((day.hours + hours) * 100) / 100;
      } else {
        existing.days.push({ date: shift.shiftDate, shifts: 1, hours });
      }
      existing.days.sort((a, b) => a.date.localeCompare(b.date));
      staff.set(worker.id, existing);
    });
  });

  return {
    period,
    dateRange: `${dateKey(range.start)} to ${dateKey(range.end)}`,
    totalHours: Math.round(Array.from(staff.values()).reduce((total, item) => total + item.totalHours, 0) * 100) / 100,
    staff: Array.from(staff.values()).sort((a, b) => b.totalHours - a.totalHours || a.workerName.localeCompare(b.workerName))
  };
}

export function getShiftDurationHours(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return 0;
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end < start) end += 24 * 60;
  return Math.round(Math.max(0, end - start) / 60 * 100) / 100;
}

export function getActualShiftHours(shift: Pick<RosterShift, "actualStartTime" | "actualEndTime" | "startTime" | "endTime">) {
  return getShiftDurationHours(shift.actualStartTime || shift.startTime, shift.actualEndTime || shift.endTime);
}

export function getShiftSignOffStatus(shift: Pick<RosterShift, "actualStartTime" | "actualEndTime" | "shiftSignOffStatus">): ShiftSignOffStatus {
  if (shift.shiftSignOffStatus) return shift.shiftSignOffStatus;
  if (shift.actualStartTime && shift.actualEndTime) return "Finished";
  if (shift.actualStartTime) return "Started";
  return "Not started";
}

export function getShiftAssignedWorkers(shift: RosterShift) {
  return shift.assignedWorkers?.length ? shift.assignedWorkers : [{ id: shift.workerId, name: shift.workerName }];
}

export function getShiftStaffLabel(shift: RosterShift, compact = false) {
  const workers = getShiftAssignedWorkers(shift).filter((worker) => worker.name && worker.name !== "Unassigned");
  if (!workers.length) return "Staff not assigned";
  if (!compact || workers.length === 1) return workers.map((worker) => worker.name).join(", ");
  return `${workers[0].name} +${workers.length - 1}`;
}

export type RosterShiftConflict = {
  workerId: string;
  workerName: string;
  candidateShift: RosterShift;
  existingShift: RosterShift;
};

export function getRosterShiftConflicts(candidate: RosterShift, existingShifts: RosterShift[]) {
  const candidateWorkerIds = new Set(getShiftAssignedWorkers(candidate).map((worker) => worker.id).filter(Boolean));
  const conflicts: RosterShiftConflict[] = [];
  if (!candidateWorkerIds.size) return conflicts;

  for (const existingShift of existingShifts) {
    if (existingShift.id === candidate.id || existingShift.shiftDate !== candidate.shiftDate) continue;
    if (existingShift.status === "Cancelled" || existingShift.status === "No Show") continue;
    if (!timesOverlap(candidate.startTime, candidate.endTime, existingShift.startTime, existingShift.endTime)) continue;

    for (const worker of getShiftAssignedWorkers(existingShift)) {
      if (candidateWorkerIds.has(worker.id)) {
        conflicts.push({ workerId: worker.id, workerName: worker.name, candidateShift: candidate, existingShift });
      }
    }
  }

  return conflicts;
}

function timesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA;
}

export function updateRosterShiftStatus(shifts: RosterShift[], shiftId: string, status: RosterStatus) {
  return shifts.map((shift) => (shift.id === shiftId ? { ...shift, status } : shift));
}

export function markRosterShiftCompleted(shifts: RosterShift[], shiftId: string) {
  return updateRosterShiftStatus(shifts, shiftId, "Completed");
}

export function startRosterShift(shifts: RosterShift[], shiftId: string, actualStartTime = currentSydneyTime()) {
  return shifts.map((shift) => (shift.id === shiftId ? {
    ...shift,
    status: "In Progress" as const,
    actualStartTime,
    shiftSignOffStatus: "Started" as const
  } : shift));
}

export function finishRosterShift(shifts: RosterShift[], shiftId: string, note = "", actualEndTime = currentSydneyTime()) {
  return shifts.map((shift) => (shift.id === shiftId ? {
    ...shift,
    status: "Completed" as const,
    actualEndTime,
    shiftSignOffNote: note.trim(),
    shiftSignOffStatus: "Finished" as const
  } : shift));
}

export function approveRosterShift(shifts: RosterShift[], shiftId: string) {
  return shifts.map((shift) => (shift.id === shiftId ? {
    ...shift,
    shiftSignOffStatus: "Approved" as const,
    shiftApprovedAt: new Date().toISOString()
  } : shift));
}

export function markRosterShiftNoteCompleted(shifts: RosterShift[], shiftId: string) {
  return shifts.map((shift) => (shift.id === shiftId ? { ...shift, status: "Note Completed" as const, noteCompleted: true } : shift));
}

export function markRosterShiftCancelled(shifts: RosterShift[], shiftId: string) {
  return shifts.map((shift) => (shift.id === shiftId ? { ...shift, status: "Cancelled" as const, noteRequired: false } : shift));
}

export function markRosterShiftVacant(shifts: RosterShift[], shiftId: string) {
  return shifts.map((shift) => (shift.id === shiftId ? {
    ...shift,
    workerId: "",
    workerName: "Vacant",
    assignedWorkers: [],
    status: "Scheduled" as const
  } : shift));
}

export function getWeekStart(selectedDate: string) {
  const date = new Date(`${selectedDate}T00:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return date;
}

export function getRosterWeekDays(selectedDate: string) {
  const start = getWeekStart(selectedDate);
  return getRosterRangeDaysFromStart(start, 7);
}

export function getRosterFortnightDays(selectedDate: string) {
  const start = getWeekStart(selectedDate);
  return getRosterRangeDaysFromStart(start, 14);
}

export function getRosterPlanningRange(selectedDate: string, view: RosterPlanningView) {
  const selected = new Date(`${selectedDate}T00:00:00`);
  const start = view === "month"
    ? new Date(selected.getFullYear(), selected.getMonth(), 1)
    : view === "quarter"
      ? new Date(selected.getFullYear(), Math.floor(selected.getMonth() / 3) * 3, 1)
      : view === "year"
        ? new Date(selected.getFullYear(), 0, 1)
        : getWeekStart(selectedDate);
  const end = new Date(start);

  if (view === "day") {
    end.setTime(selected.getTime());
    start.setTime(selected.getTime());
  } else if (view === "week") {
    end.setDate(start.getDate() + 6);
  } else if (view === "fortnight") {
    end.setDate(start.getDate() + 13);
  } else if (view === "month") {
    end.setMonth(start.getMonth() + 1);
    end.setDate(0);
  } else if (view === "quarter") {
    end.setMonth(start.getMonth() + 3);
    end.setDate(0);
  } else {
    end.setFullYear(start.getFullYear() + 1);
    end.setDate(0);
  }

  return {
    start,
    end,
    startKey: dateKey(start),
    endKey: dateKey(end),
    label: formatRosterRangeLabel(start, end, view)
  };
}

function getRosterRangeDaysFromStart(start: Date, length: number) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      date,
      dateKey: dateKey(date),
      label: date.toLocaleDateString("en-AU", { weekday: "short" }),
      shortDate: date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    };
  });
}

function formatRosterRangeLabel(start: Date, end: Date, view: RosterPlanningView) {
  if (view === "day") return start.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (view === "month") return start.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  if (view === "quarter") return `${start.toLocaleDateString("en-AU", { month: "short" })} - ${end.toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`;
  if (view === "year") return String(start.getFullYear());
  return `${start.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
}

function getRosterReportRange(period: RosterReportPeriod, selectedDate: string) {
  const selected = new Date(`${selectedDate}T00:00:00`);
  const start = period === "monthly" ? new Date(selected.getFullYear(), selected.getMonth(), 1) : getWeekStart(selectedDate);
  const end = new Date(start);

  if (period === "weekly") {
    end.setDate(start.getDate() + 6);
  } else if (period === "fortnightly") {
    end.setDate(start.getDate() + 13);
  } else {
    end.setMonth(start.getMonth() + 1);
    end.setDate(0);
  }

  const labels: Record<RosterReportPeriod, string> = {
    weekly: "Weekly status report",
    fortnightly: "Fortnightly status report",
    monthly: "Monthly status report"
  };

  return { start, end, label: labels[period] };
}

function currentSydneyTime() {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date());
}

export function getRosterSelectOptions() {
  if (typeof window !== "undefined" && !isPresentationModeEnabled()) {
    return { participants: [], workers: [], supportTypes };
  }
  return {
    participants,
    workers: users,
    supportTypes
  };
}
