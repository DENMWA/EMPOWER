"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, LayoutGrid, ListChecks, LockKeyhole, UserPlus } from "lucide-react";
import { CreateRosterShiftModal } from "@/components/roster/CreateRosterShiftModal";
import { EmployeeColourLegend } from "@/components/roster/EmployeeColourLegend";
import { RosterDayView } from "@/components/roster/RosterDayView";
import { RosterFilters } from "@/components/roster/RosterFilters";
import { RosterMonthView } from "@/components/roster/RosterMonthView";
import { RosterIntelligencePanel } from "@/components/roster/RosterIntelligencePanel";
import { RosterShiftModal } from "@/components/roster/RosterShiftModal";
import { RosterStatusReports } from "@/components/roster/RosterStatusReports";
import { RosterWeekView } from "@/components/roster/RosterWeekView";
import { Card, PageHeader, Section } from "@/components/ui";
import {
  filterRosterShifts,
  getRosterShiftConflicts,
  getRosterSummary,
  getWeekRosterShifts,
  markRosterShiftCompleted,
  markRosterShiftCancelled,
  markRosterShiftNoteCompleted,
  markRosterShiftVacant,
  getShiftAssignedWorkers,
  saveRosterShifts,
  type RosterFilters as RosterFiltersType,
  type RosterShift
} from "@/lib/roster";
import { cn } from "@/lib/utils";
import { loadTenantRosterShifts, saveTenantRosterShift } from "@/lib/roster-cloud";
import { getTenantStaffInvites } from "@/lib/staff-records";

export function RosterPage() {
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [filters, setFilters] = useState<RosterFiltersType>({ workerId: "all", serviceLocationId: "all", status: "all", noteState: "all" });
  const [shifts, setShifts] = useState<RosterShift[]>([]);
  const [activeShift, setActiveShift] = useState<RosterShift | null>(null);
  const [creating, setCreating] = useState(false);
  const [shiftPrefill, setShiftPrefill] = useState<{ shiftDate?: string; workerIds?: string[] } | undefined>();
  const [staffOptions, setStaffOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [syncMessage, setSyncMessage] = useState("Loading roster from your workspace...");
  const [replacementShiftId, setReplacementShiftId] = useState("");

  useEffect(() => {
    Promise.all([loadTenantRosterShifts(), getTenantStaffInvites()]).then(([result, staff]) => {
      setShifts(result.shifts);
      setStaffOptions(staff.map(({ id, name }) => ({ id, name })));
      setSyncMessage(result.error || "Roster connected to workspace.");
    }).catch(() => {
      setShifts([]);
      setSyncMessage("The roster could not be loaded from the workspace.");
    });
  }, []);

  const visibleShifts = useMemo(() => {
    const scoped = view === "day"
      ? shifts.filter((shift) => shift.shiftDate === selectedDate)
      : view === "week"
        ? getWeekRosterShifts(shifts, selectedDate)
        : shifts;
    return filterRosterShifts(scoped, filters);
  }, [filters, selectedDate, shifts, view]);

  const summary = getRosterSummary(shifts);
  const rosterConflicts = shifts.flatMap((shift, index) => getRosterShiftConflicts(shift, shifts.slice(0, index)));
  const rosterWorkers = Array.from(new Map(shifts.flatMap((shift) => getShiftAssignedWorkers(shift)).map((worker) => [worker.id, worker])).values());
  const allRosterWorkers = Array.from(new Map([...staffOptions, ...rosterWorkers].filter((worker) => worker.id).map((worker) => [worker.id, worker])).values());
  const rosterLocations = Array.from(new Map(shifts.filter((shift) => shift.serviceLocationId).map((shift) => [shift.serviceLocationId!, { id: shift.serviceLocationId!, name: shift.serviceLocationName || shift.location }])).values());
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
    ...(view === "day" ? { day: "numeric", weekday: "long" } : {})
  });

  function moveCalendar(direction: -1 | 1) {
    const date = new Date(`${selectedDate}T00:00:00`);
    if (view === "day") date.setDate(date.getDate() + direction);
    if (view === "week") date.setDate(date.getDate() + (7 * direction));
    if (view === "month") date.setMonth(date.getMonth() + direction);
    setSelectedDate(toDateKey(date));
  }

  function openDay(date: string) {
    setSelectedDate(date);
    setView("day");
  }

  function openCreateShift(prefill?: { shiftDate?: string; workerIds?: string[] }) {
    setShiftPrefill(prefill);
    setCreating(true);
  }

  function updateActive(updatedShifts: RosterShift[], shiftId: string) {
    setShifts(updatedShifts);
    saveRosterShifts(updatedShifts);
    if (activeShift) {
      setActiveShift(updatedShifts.find((shift) => shift.id === activeShift.id) ?? null);
    }
    const updatedShift = updatedShifts.find((shift) => shift.id === shiftId);
    if (updatedShift) {
      setSyncMessage("Saving roster change...");
      void saveTenantRosterShift(updatedShift).then((result) => {
        if (!result.savedToCloud) {
          setShifts(shifts);
          saveRosterShifts(shifts);
          setActiveShift(shifts.find((shift) => shift.id === activeShift?.id) ?? null);
        }
        setSyncMessage(result.savedToCloud ? "Roster change saved to workspace." : result.error || "Roster change could not be saved.");
      });
    }
  }

  function addShiftToCalendar(shift: RosterShift) {
    const conflicts = getRosterShiftConflicts(shift, shifts);
    if (conflicts.length) {
      const conflictSummary = conflicts.map(({ workerName, existingShift }) =>
        `${workerName} is already rostered with ${existingShift.participantName} from ${existingShift.startTime} to ${existingShift.endTime}`
      ).join("; ");
      return `Shift conflict: ${conflictSummary}. Change the worker or shift time before saving.`;
    }
    const updatedShifts = [...shifts, shift];
    setShifts(updatedShifts);
    saveRosterShifts(updatedShifts);
    setSelectedDate(shift.shiftDate);
    setView("day");
    setActiveShift(shift);
    setSyncMessage("Saving new shift...");
    void saveTenantRosterShift(shift).then((result) => {
      if (!result.savedToCloud) {
        setShifts(shifts);
        saveRosterShifts(shifts);
        setActiveShift(null);
      }
      setSyncMessage(result.savedToCloud ? "New shift saved to workspace." : result.error || "New shift could not be saved.");
    });
    return "";
  }

  function assignRecommendedWorker(shiftId: string, worker: { id: string; name: string }) {
    const updatedShifts = shifts.map((shift) => shift.id === shiftId ? {
      ...shift,
      workerId: worker.id,
      workerName: worker.name,
      assignedWorkers: [worker],
      status: "Scheduled" as const
    } : shift);
    updateActive(updatedShifts, shiftId);
  }

  function startReplacementWorkflow(shiftId: string) {
    setReplacementShiftId(shiftId);
    setActiveShift(null);
    setSyncMessage("Replacement recommendations are ready below. Review availability before sending requests.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin scheduling"
        title="Team scheduling and coverage calendar"
        description="Add roster shifts with service particulars, assign workers, review coverage, open shift details, and monitor documentation completion from one calendar."
        actions={
          <>
            <Link href="/admin/staff/new" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink shadow-sm hover:border-teal-400">
              <UserPlus size={18} aria-hidden="true" />Add staff
            </Link>
            <button type="button" onClick={() => openCreateShift()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
              <CalendarPlus size={18} aria-hidden="true" />Add roster shift
            </button>
          </>
        }
      />

      <Section className="space-y-6">
        <Card className={syncMessage.toLowerCase().includes("could not") ? "border-red-200 bg-red-50" : "border-sky-100 bg-sky-50"}>
          <p className="text-sm font-semibold text-slate-700">{syncMessage}</p>
        </Card>
        <Card className="border-teal-200 bg-teal-50">
          <div className="flex flex-wrap items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-white text-teal-800 shadow-sm">
              <LockKeyhole size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink">Admin-only access</h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">Roster planning and status reports are locked for admin users. Worker workflows stay focused on participants, notes, incidents, and documents.</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Card><p className="text-sm font-medium text-slate-600">Today&apos;s rostered shifts</p><p className="mt-2 text-3xl font-bold text-ink">{summary.todayCount}</p></Card>
          <Card><p className="text-sm font-medium text-slate-600">Shifts in progress</p><p className="mt-2 text-3xl font-bold text-sky-800">{summary.inProgress}</p></Card>
          <Card><p className="text-sm font-medium text-slate-600">Completed needing notes</p><p className="mt-2 text-3xl font-bold text-amber-800">{summary.completedNeedingNotes}</p></Card>
          <Card><p className="text-sm font-medium text-slate-600">Cancelled/no-show shifts</p><p className="mt-2 text-3xl font-bold text-red-700">{summary.cancelledOrNoShow}</p></Card>
          <Card className={rosterConflicts.length ? "border-red-200 bg-red-50" : ""}><p className="text-sm font-medium text-slate-600">Staff conflicts</p><p className={cn("mt-2 text-3xl font-bold", rosterConflicts.length ? "text-red-700" : "text-emerald-700")}>{rosterConflicts.length}</p></Card>
        </div>

        {rosterConflicts.length ? (
          <Card className="border-red-200 bg-red-50">
            <h2 className="font-semibold text-red-900">Existing roster conflicts need review</h2>
            <div className="mt-2 space-y-1 text-sm text-red-800">
              {rosterConflicts.map(({ workerId, workerName, candidateShift, existingShift }, index) => (
                <p key={`${workerId}-${existingShift.id}-${index}`}>{workerName}: {existingShift.participantName} {existingShift.startTime}-{existingShift.endTime} overlaps {candidateShift.participantName} {candidateShift.startTime}-{candidateShift.endTime} on {existingShift.shiftDate}.</p>
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Calendar period</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => moveCalendar(-1)} className="grid h-10 w-10 place-items-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-teal-400" aria-label={`Previous ${view}`}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setSelectedDate(toDateKey(new Date()))} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-teal-400">
                Today
              </button>
              <button type="button" onClick={() => moveCalendar(1)} className="grid h-10 w-10 place-items-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-teal-400" aria-label={`Next ${view}`}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
              <h2 className="ml-1 text-xl font-bold text-ink">{selectedDateLabel}</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Date
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3" />
            </label>
            <div className="grid grid-cols-3 rounded-md border border-slate-300 bg-white p-1" aria-label="Roster view">
              <button type="button" onClick={() => setView("day")} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold", view === "day" ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-50")}>
                <ListChecks size={17} aria-hidden="true" />Day
              </button>
              <button type="button" onClick={() => setView("week")} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold", view === "week" ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-50")}>
                <LayoutGrid size={17} aria-hidden="true" />Week
              </button>
              <button type="button" onClick={() => setView("month")} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold", view === "month" ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-50")}>
                <CalendarDays size={17} aria-hidden="true" />Month
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Worker allocation</p>
          <div className="mt-3"><EmployeeColourLegend workers={allRosterWorkers} /></div>
        </Card>

        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Roster coverage colours</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-950"><span className="h-3 w-3 rounded-full bg-sky-500" aria-hidden="true" />Assigned shift</div>
            <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950"><span className="h-3 w-3 rounded-full bg-amber-500" aria-hidden="true" />Unassigned shift</div>
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-950"><span className="h-3 w-3 rounded-full bg-red-500" aria-hidden="true" />Vacant or cancelled</div>
          </div>
        </Card>

        <RosterFilters filters={filters} onChange={setFilters} workers={allRosterWorkers} serviceLocations={rosterLocations} />

        <RosterStatusReports shifts={shifts} selectedDate={selectedDate} />

        <RosterIntelligencePanel shifts={shifts} selectedDate={selectedDate} replacementShiftId={replacementShiftId} onAssign={assignRecommendedWorker} />

        {view === "day" ? (
          <RosterDayView date={selectedDate} shifts={visibleShifts} onOpenShift={setActiveShift} />
        ) : view === "week" ? (
          <RosterWeekView selectedDate={selectedDate} shifts={visibleShifts} workers={allRosterWorkers} onOpenShift={setActiveShift} onCreateShift={({ shiftDate, workerId }) => openCreateShift({ shiftDate, workerIds: workerId ? [workerId] : [] })} />
        ) : (
          <RosterMonthView selectedDate={selectedDate} shifts={visibleShifts} onOpenShift={setActiveShift} onSelectDate={openDay} />
        )}
      </Section>

      <RosterShiftModal
        shift={activeShift}
        onClose={() => setActiveShift(null)}
        onComplete={(shiftId) => updateActive(markRosterShiftCompleted(shifts, shiftId), shiftId)}
        onNoteCompleted={(shiftId) => updateActive(markRosterShiftNoteCompleted(shifts, shiftId), shiftId)}
        onCancelShift={(shiftId) => updateActive(markRosterShiftCancelled(shifts, shiftId), shiftId)}
        onMarkVacant={(shiftId) => updateActive(markRosterShiftVacant(shifts, shiftId), shiftId)}
        onRequestReplacement={startReplacementWorkflow}
      />
      <CreateRosterShiftModal open={creating} onClose={() => setCreating(false)} onCreate={addShiftToCalendar} prefill={shiftPrefill} />
    </>
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
