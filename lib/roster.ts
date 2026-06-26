import { participants, supportTypes, users } from "@/lib/sample-data";

export type RosterStatus = "Scheduled" | "In Progress" | "Completed" | "Note Required" | "Note Completed" | "Cancelled" | "No Show";

export type RosterShift = {
  id: string;
  participantId: string;
  participantName: string;
  workerId: string;
  workerName: string;
  supportType: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  location: string;
  shiftInstructions: string;
  status: RosterStatus;
  noteRequired: boolean;
  noteCompleted: boolean;
  progressNoteId?: string;
};

export type RosterFilters = {
  workerId: string;
  status: string;
  noteState: string;
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

const employeeColours: Record<string, EmployeeColourScheme> = {
  "mary-wanjiku": {
    key: "mary-wanjiku",
    label: "Mary",
    border: "border-teal-500",
    bg: "bg-teal-600",
    softBg: "bg-teal-50",
    text: "text-teal-900",
    ring: "ring-teal-200",
    dot: "bg-teal-500"
  },
  "james-patel": {
    key: "james-patel",
    label: "James",
    border: "border-sky-500",
    bg: "bg-sky-600",
    softBg: "bg-sky-50",
    text: "text-sky-900",
    ring: "ring-sky-200",
    dot: "bg-sky-500"
  },
  "dennis-mwangi": {
    key: "dennis-mwangi",
    label: "Dennis",
    border: "border-indigo-500",
    bg: "bg-indigo-600",
    softBg: "bg-indigo-50",
    text: "text-indigo-900",
    ring: "ring-indigo-200",
    dot: "bg-indigo-500"
  },
  "sarah-collins": {
    key: "sarah-collins",
    label: "Sarah",
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
const thisWeek = addDays(3);

export const rosterStatuses: RosterStatus[] = ["Scheduled", "In Progress", "Completed", "Note Required", "Note Completed", "Cancelled", "No Show"];

export const rosterShifts: RosterShift[] = [
  {
    id: "shift-001",
    participantId: "joseph-k",
    participantName: "Joseph K.",
    workerId: "mary-wanjiku",
    workerName: "Mary Wanjiku",
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
    participantId: "amelia-r",
    participantName: "Amelia R.",
    workerId: "james-patel",
    workerName: "James Patel",
    supportType: "Personal care",
    shiftDate: today,
    startTime: "07:00",
    endTime: "09:00",
    location: "Home",
    shiftInstructions: "Follow Amelia's visual choices and allow processing time before each task.",
    status: "Note Completed",
    noteRequired: true,
    noteCompleted: true,
    progressNoteId: "note-002"
  },
  {
    id: "shift-003",
    participantId: "daniel-m",
    participantName: "Daniel M.",
    workerId: "mary-wanjiku",
    workerName: "Mary Wanjiku",
    supportType: "Behaviour support implementation",
    shiftDate: today,
    startTime: "15:00",
    endTime: "17:00",
    location: "SIL residence",
    shiftInstructions: "Record strategies used, Daniel's response, and any follow-up needed.",
    status: "Scheduled",
    noteRequired: true,
    noteCompleted: false
  },
  {
    id: "shift-004",
    participantId: "sarah-t",
    participantName: "Sarah T.",
    workerId: "dennis-mwangi",
    workerName: "Dennis Mwangi",
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
    participantId: "joseph-k",
    participantName: "Joseph K.",
    workerId: "sarah-collins",
    workerName: "Sarah Collins",
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

export function getRosterShifts() {
  return rosterShifts;
}

export function getTodayRosterShifts(shifts: RosterShift[] = rosterShifts) {
  return shifts.filter((shift) => shift.shiftDate === today);
}

export function getWeekRosterShifts(shifts: RosterShift[] = rosterShifts, selectedDate = today) {
  const start = getWeekStart(selectedDate);
  const dates = Array.from({ length: 7 }, (_, index) => dateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)));
  return shifts.filter((shift) => dates.includes(shift.shiftDate));
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

export function filterRosterShifts(shifts: RosterShift[], filters: RosterFilters) {
  return shifts.filter((shift) => {
    const workerMatches = filters.workerId === "all" || shift.workerId === filters.workerId;
    const statusMatches = filters.status === "all" || shift.status === filters.status;
    const noteMatches =
      filters.noteState === "all" ||
      (filters.noteState === "required" && shift.noteRequired && !shift.noteCompleted) ||
      (filters.noteState === "completed" && shift.noteCompleted) ||
      (filters.noteState === "not-required" && !shift.noteRequired);
    return workerMatches && statusMatches && noteMatches;
  });
}

export function createRosterShift(input: Omit<RosterShift, "id" | "participantName" | "workerName">) {
  const participant = participants.find((item) => item.id === input.participantId);
  const worker = users.find((item) => item.id === input.workerId);
  return {
    ...input,
    id: `shift-${Date.now()}`,
    participantName: participant?.name ?? "Participant",
    workerName: worker?.name ?? "Worker"
  };
}

export function updateRosterShiftStatus(shifts: RosterShift[], shiftId: string, status: RosterStatus) {
  return shifts.map((shift) => (shift.id === shiftId ? { ...shift, status } : shift));
}

export function markRosterShiftCompleted(shifts: RosterShift[], shiftId: string) {
  return updateRosterShiftStatus(shifts, shiftId, "Completed");
}

export function markRosterShiftNoteCompleted(shifts: RosterShift[], shiftId: string) {
  return shifts.map((shift) => (shift.id === shiftId ? { ...shift, status: "Note Completed" as const, noteCompleted: true } : shift));
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
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      date,
      dateKey: dateKey(date),
      label: date.toLocaleDateString("en-AU", { weekday: "short" }),
      shortDate: date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    };
  });
}

export function getRosterSelectOptions() {
  return {
    participants,
    workers: users,
    supportTypes
  };
}
