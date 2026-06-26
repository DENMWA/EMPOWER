"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, LayoutGrid, ListChecks } from "lucide-react";
import { CreateRosterShiftModal } from "@/components/roster/CreateRosterShiftModal";
import { EmployeeColourLegend } from "@/components/roster/EmployeeColourLegend";
import { RosterDayView } from "@/components/roster/RosterDayView";
import { RosterFilters } from "@/components/roster/RosterFilters";
import { RosterShiftModal } from "@/components/roster/RosterShiftModal";
import { RosterWeekView } from "@/components/roster/RosterWeekView";
import { Card, PageHeader, Section } from "@/components/ui";
import {
  filterRosterShifts,
  getRosterSummary,
  getWeekRosterShifts,
  markRosterShiftCompleted,
  markRosterShiftNoteCompleted,
  rosterShifts,
  type RosterFilters as RosterFiltersType,
  type RosterShift
} from "@/lib/roster";
import { cn } from "@/lib/utils";

export function RosterPage() {
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [filters, setFilters] = useState<RosterFiltersType>({ workerId: "all", status: "all", noteState: "all" });
  const [shifts, setShifts] = useState<RosterShift[]>(rosterShifts);
  const [activeShift, setActiveShift] = useState<RosterShift | null>(null);
  const [creating, setCreating] = useState(false);

  const visibleShifts = useMemo(() => {
    const scoped = view === "day" ? shifts.filter((shift) => shift.shiftDate === selectedDate) : getWeekRosterShifts(shifts, selectedDate);
    return filterRosterShifts(scoped, filters);
  }, [filters, selectedDate, shifts, view]);

  const summary = getRosterSummary(shifts);

  function updateActive(updatedShifts: RosterShift[]) {
    setShifts(updatedShifts);
    if (activeShift) {
      setActiveShift(updatedShifts.find((shift) => shift.id === activeShift.id) ?? null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Plan shifts and track the notes that need to follow"
        description="A lightweight schedule for support teams: see who is working, what support is planned, and whether the progress note is still outstanding."
        actions={
          <button type="button" onClick={() => setCreating(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
            <CalendarPlus size={18} aria-hidden="true" />Create shift
          </button>
        }
      />

      <Section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><p className="text-sm font-medium text-slate-600">Today&apos;s rostered shifts</p><p className="mt-2 text-3xl font-bold text-ink">{summary.todayCount}</p></Card>
          <Card><p className="text-sm font-medium text-slate-600">Shifts in progress</p><p className="mt-2 text-3xl font-bold text-sky-800">{summary.inProgress}</p></Card>
          <Card><p className="text-sm font-medium text-slate-600">Completed needing notes</p><p className="mt-2 text-3xl font-bold text-amber-800">{summary.completedNeedingNotes}</p></Card>
          <Card><p className="text-sm font-medium text-slate-600">Cancelled/no-show shifts</p><p className="mt-2 text-3xl font-bold text-red-700">{summary.cancelledOrNoShow}</p></Card>
        </div>

        <Card className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Team colours</p>
            <div className="mt-3"><EmployeeColourLegend /></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Date
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3" />
            </label>
            <div className="grid grid-cols-2 rounded-md border border-slate-300 bg-white p-1" aria-label="Roster view">
              <button type="button" onClick={() => setView("day")} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold", view === "day" ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-50")}>
                <ListChecks size={17} aria-hidden="true" />Day
              </button>
              <button type="button" onClick={() => setView("week")} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold", view === "week" ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-50")}>
                <LayoutGrid size={17} aria-hidden="true" />Week
              </button>
            </div>
          </div>
        </Card>

        <RosterFilters filters={filters} onChange={setFilters} />

        {view === "day" ? (
          <RosterDayView date={selectedDate} shifts={visibleShifts} onOpenShift={setActiveShift} />
        ) : (
          <RosterWeekView selectedDate={selectedDate} shifts={visibleShifts} onOpenShift={setActiveShift} />
        )}
      </Section>

      <RosterShiftModal
        shift={activeShift}
        onClose={() => setActiveShift(null)}
        onComplete={(shiftId) => updateActive(markRosterShiftCompleted(shifts, shiftId))}
        onNoteCompleted={(shiftId) => updateActive(markRosterShiftNoteCompleted(shifts, shiftId))}
      />
      <CreateRosterShiftModal open={creating} onClose={() => setCreating(false)} onCreate={(shift) => setShifts((current) => [...current, shift])} />
    </>
  );
}
