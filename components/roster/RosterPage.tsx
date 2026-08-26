"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Download, LayoutGrid, LockKeyhole, UserPlus } from "lucide-react";
import { CreateRosterShiftModal } from "@/components/roster/CreateRosterShiftModal";
import { EmployeeColourLegend } from "@/components/roster/EmployeeColourLegend";
import { RosterDayView } from "@/components/roster/RosterDayView";
import { RosterFilters } from "@/components/roster/RosterFilters";
import { RosterPlanningOverview } from "@/components/roster/RosterPlanningOverview";
import { RosterIntelligencePanel } from "@/components/roster/RosterIntelligencePanel";
import { RosterShiftModal } from "@/components/roster/RosterShiftModal";
import { RosterStatusReports } from "@/components/roster/RosterStatusReports";
import { RosterWeekView } from "@/components/roster/RosterWeekView";
import { Card, PageHeader, Section } from "@/components/ui";
import { getTenantClients } from "@/lib/client-records";
import {
  filterRosterShifts,
  getRosterPlanningRange,
  getRosterRangeShifts,
  getRosterShiftConflicts,
  getRosterSummary,
  getRosterCoverageColour,
  getShiftDurationHours,
  getShiftStaffLabel,
  markRosterShiftCompleted,
  markRosterShiftCancelled,
  markRosterShiftNoteCompleted,
  markRosterShiftVacant,
  getShiftAssignedWorkers,
  saveRosterShifts,
  type RosterFilters as RosterFiltersType,
  type RosterPlanningView,
  type RosterShift
} from "@/lib/roster";
import { cn } from "@/lib/utils";
import { loadTenantRosterShifts, saveTenantRosterShift } from "@/lib/roster-cloud";
import { getRosteringMode, rosteringModeOptions, type RosteringMode } from "@/lib/rostering-mode";
import { getTenantStaffInvites, isStaffActiveForRostering } from "@/lib/staff-records";
import { defaultOrganisationProfile, getTenantOrganisationProfile, type OrganisationProfile } from "@/lib/organisation-profile";

export function RosterPage() {
  const [view, setView] = useState<RosterPlanningView>("week");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [planningOffsetWeeks, setPlanningOffsetWeeks] = useState(0);
  const [filters, setFilters] = useState<RosterFiltersType>({ workerId: "all", serviceLocationId: "all", status: "all", noteState: "all" });
  const [shifts, setShifts] = useState<RosterShift[]>([]);
  const [activeShift, setActiveShift] = useState<RosterShift | null>(null);
  const [creating, setCreating] = useState(false);
  const [shiftPrefill, setShiftPrefill] = useState<{ shiftDate?: string; workerIds?: string[] } | undefined>();
  const [staffOptions, setStaffOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [clientOptions, setClientOptions] = useState<Array<{ id: string; name: string; profilePhotoPath?: string }>>([]);
  const [syncMessage, setSyncMessage] = useState("Loading roster from your workspace...");
  const [replacementShiftId, setReplacementShiftId] = useState("");
  const [rosterToolsReady, setRosterToolsReady] = useState(false);
  const [rosteringMode, setRosteringModeState] = useState<RosteringMode>("built-in");
  const [organisationProfile, setOrganisationProfile] = useState<OrganisationProfile>(defaultOrganisationProfile);

  useEffect(() => {
    Promise.all([loadTenantRosterShifts(), getTenantStaffInvites(), getTenantClients()]).then(([result, staff, clients]) => {
      setShifts(result.shifts);
      setStaffOptions(staff.filter(isStaffActiveForRostering).map(({ id, name }) => ({ id, name })));
      setClientOptions(clients.map(({ id, name, profilePhotoPath }) => ({ id, name, profilePhotoPath })));
      setSyncMessage(result.error || "Roster connected to workspace.");
    }).catch(() => {
      setShifts([]);
      setSyncMessage("The roster could not be loaded from the workspace.");
    });
  }, []);

  useEffect(() => {
    getTenantOrganisationProfile().then(setOrganisationProfile).catch(() => setOrganisationProfile(defaultOrganisationProfile));
  }, []);

  useEffect(() => {
    function syncRosteringMode() {
      setRosteringModeState(getRosteringMode());
    }

    syncRosteringMode();
    window.addEventListener("empowernotes:rostering-mode-updated", syncRosteringMode);
    return () => window.removeEventListener("empowernotes:rostering-mode-updated", syncRosteringMode);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setRosterToolsReady(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleShifts = useMemo(() => {
    const scoped = getRosterRangeShifts(shifts, selectedDate, view);
    return filterRosterShifts(scoped, filters);
  }, [filters, selectedDate, shifts, view]);
  const rosterSheetShifts = useMemo(() => getRosterRangeShifts(shifts, selectedDate, view), [selectedDate, shifts, view]);

  const summary = getRosterSummary(shifts);
  const rosterConflicts = shifts.flatMap((shift, index) => getRosterShiftConflicts(shift, shifts.slice(0, index)));
  const rosterWorkers = Array.from(new Map(shifts.flatMap((shift) => getShiftAssignedWorkers(shift)).map((worker) => [worker.id, worker])).values());
  const allRosterWorkers = Array.from(new Map([...staffOptions, ...rosterWorkers].filter((worker) => worker.id).map((worker) => [worker.id, worker])).values());
  const rosterLocations = Array.from(new Map(shifts.filter((shift) => shift.serviceLocationId).map((shift) => [shift.serviceLocationId!, { id: shift.serviceLocationId!, name: shift.serviceLocationName || shift.location }])).values());
  const selectedRange = getRosterPlanningRange(selectedDate, view);
  const selectedDateLabel = selectedRange.label;
  const rosterModeLabel = rosteringModeOptions.find((option) => option.value === rosteringMode)?.label || "Use EmpowerNotes roster";

  function moveCalendar(direction: -1 | 1) {
    const date = new Date(`${selectedDate}T00:00:00`);
    if (view === "day") date.setDate(date.getDate() + direction);
    if (view === "week") date.setDate(date.getDate() + (7 * direction));
    if (view === "fortnight") date.setDate(date.getDate() + (14 * direction));
    if (view === "month") date.setMonth(date.getMonth() + direction);
    if (view === "quarter") date.setMonth(date.getMonth() + (3 * direction));
    if (view === "year") date.setFullYear(date.getFullYear() + direction);
    setSelectedDate(toDateKey(date));
  }

  function openWeek(date: string) {
    setSelectedDate(date);
    setView("week");
  }

  function openCreateShift(prefill?: { shiftDate?: string; workerIds?: string[] }) {
    setShiftPrefill(prefill);
    setCreating(true);
  }

  function jumpPlanningOffset(weeks: number) {
    const today = new Date();
    today.setDate(today.getDate() + weeks * 7);
    setPlanningOffsetWeeks(weeks);
    setSelectedDate(toDateKey(today));
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
    keepRosterSheetOpenAfterSave(shift);
    setActiveShift(null);
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

  function keepRosterSheetOpenAfterSave(shift: RosterShift) {
    if (shift.shiftDate < selectedRange.startKey || shift.shiftDate > selectedRange.endKey) {
      setSelectedDate(shift.shiftDate);
    }
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

  function downloadRoster() {
    const rows = rosterSheetShifts
      .slice()
      .sort((first, second) => `${first.shiftDate} ${first.startTime}`.localeCompare(`${second.shiftDate} ${second.startTime}`))
      .map((shift) => ({ shift, colour: getRosterPdfColour(shift) }));
    const organisationName = organisationProfile.organisationName || "Organisation";
    const printed = printRosterPdf({
      title: `${organisationName} roster`,
      filename: `${slugifyFilename(organisationName)}-roster-${view}-${selectedRange.startKey}-to-${selectedRange.endKey}.pdf`,
      organisationProfile,
      period: selectedDateLabel,
      mode: rosterModeLabel,
      rows
    });
    setSyncMessage(printed ? `${selectedDateLabel} roster PDF is ready to save.` : "Roster PDF could not open. Check browser pop-up or print settings.");
  }

  async function importRosterCsv(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const imported = parseRosterCsv(text, clientOptions, staffOptions);
    if (!imported.shifts.length) {
      setSyncMessage(imported.warning || "No roster rows could be imported. Check the CSV headings and try again.");
      return;
    }
    const updated = mergeRosterShifts(shifts, imported.shifts);
    setShifts(updated);
    saveRosterShifts(updated);
    setSyncMessage(`${imported.shifts.length} roster shift${imported.shifts.length === 1 ? "" : "s"} imported. ${imported.warning}`);
    for (const shift of imported.shifts.filter((item) => item.participantId && item.participantId !== "imported-client")) {
      void saveTenantRosterShift(shift);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin scheduling"
        title="Team scheduling and coverage calendar"
        description={rosteringMode === "built-in" ? "Add roster shifts with service particulars, assign workers, review coverage, open shift details, and monitor documentation completion from one calendar." : rosteringMode === "imported" ? "Use an external roster, import shifts when needed, and keep notes, billing and reporting aligned in EmpowerNotes." : "Use manual shift details for notes, incidents, billing evidence and reports without running a full roster in EmpowerNotes."}
        actions={
          <>
            <Link href="/admin/staff/new" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink shadow-sm hover:border-teal-400">
              <UserPlus size={18} aria-hidden="true" />Add staff
            </Link>
            {rosteringMode !== "imported" ? (
              <button type="button" onClick={() => openCreateShift()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
                <CalendarPlus size={18} aria-hidden="true" />{rosteringMode === "manual" ? "Add manual shift" : "Add roster shift"}
              </button>
            ) : null}
          </>
        }
      />

      <Section className="space-y-6">
        <Card className={syncMessage.toLowerCase().includes("could not") ? "border-red-200 bg-red-50" : "border-sky-100 bg-sky-50"}>
          <p className="text-sm font-semibold text-slate-700">{syncMessage}</p>
        </Card>
        <Card className="border-sky-100 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sea">Rostering mode</p>
              <h2 className="mt-1 text-xl font-bold text-ink">{rosterModeLabel}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {rosteringMode === "built-in"
                  ? "EmpowerNotes is the active roster source. Use the calendar, staff availability and replacement tools here."
                  : rosteringMode === "imported"
                    ? "Keep the provider's existing roster platform as the source of truth, then import shifts here for documentation, reporting and billing evidence."
                    : "Roster creation is optional. Staff can still document support by entering client, service, date and time details in their records."}
              </p>
            </div>
            <Link href="/admin/settings" className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink hover:border-teal-400">Change mode</Link>
          </div>
          {rosteringMode === "imported" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-teal-100 bg-teal-50 p-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
                <Download size={17} aria-hidden="true" />
                Import roster CSV
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { void importRosterCsv(event.target.files?.[0]); event.target.value = ""; }} />
              </label>
              <p className="text-sm leading-6 text-teal-950">CSV headings can include date, start, end, client, staff, support type, location, ratio and instructions.</p>
            </div>
          ) : null}
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
            <button type="button" onClick={downloadRoster} className="mt-auto inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink shadow-sm hover:border-teal-400">
              <Download size={17} aria-hidden="true" />Download PDF roster
            </button>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Date
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3" />
            </label>
            <div className="grid grid-cols-2 rounded-md border border-slate-300 bg-white p-1 sm:grid-cols-5" aria-label="Roster planning range">
              {(["week", "fortnight", "month", "quarter", "year"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setView(range)}
                  className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold capitalize", view === range ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-50")}
                >
                  {range === "week" ? <LayoutGrid size={17} aria-hidden="true" /> : range === "month" ? <CalendarDays size={17} aria-hidden="true" /> : null}
                  {range}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <details className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sea">Roster controls</p>
                <h2 className="mt-1 text-lg font-bold text-ink">Filters, legend and reports</h2>
              </div>
              <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">Open</span>
            </div>
          </summary>
          <div className="mt-5 space-y-4">
            <Card className="border-slate-200 shadow-none">
              <p className="text-sm font-semibold uppercase tracking-wide text-sea">Worker allocation</p>
              <div className="mt-3"><EmployeeColourLegend workers={allRosterWorkers} /></div>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <p className="text-sm font-semibold uppercase tracking-wide text-sea">Roster coverage colours</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-950"><span className="h-3 w-3 rounded-full bg-sky-500" aria-hidden="true" />Assigned shift</div>
                <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950"><span className="h-3 w-3 rounded-full bg-amber-500" aria-hidden="true" />Unassigned shift</div>
                <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-950"><span className="h-3 w-3 rounded-full bg-red-500" aria-hidden="true" />Vacant or cancelled</div>
              </div>
            </Card>

            <RosterFilters filters={filters} onChange={setFilters} workers={allRosterWorkers} serviceLocations={rosterLocations} />

            <RosterStatusReports shifts={shifts} selectedDate={selectedDate} />
          </div>
        </details>

        {rosteringMode !== "manual" && rosterToolsReady ? (
          <RosterIntelligencePanel shifts={shifts} selectedDate={selectedDate} replacementShiftId={replacementShiftId} onAssign={assignRecommendedWorker} />
        ) : rosteringMode !== "manual" ? (
          <Card>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Roster intelligence</p>
            <p className="mt-2 text-sm text-slate-600">Preparing availability and replacement insights.</p>
          </Card>
        ) : (
          <Card>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Manual shift details</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Roster intelligence is paused in manual mode. Use progress notes and incident forms to capture service date, time, client and support details.</p>
          </Card>
        )}

        {view === "week" || view === "fortnight" ? (
          <Card className="border-sky-200 bg-sky-50">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">Roster sheet navigator</p>
                <h2 className="mt-1 text-xl font-bold text-ink">{view === "week" ? "Move calendar roster by week" : "Move calendar roster by fortnight"}</h2>
                <label className="mt-3 grid max-w-3xl gap-2 text-sm font-medium text-slate-700">
                  {planningOffsetWeeks === 0 ? "Current roster week" : `${planningOffsetWeeks} week${planningOffsetWeeks === 1 ? "" : "s"} ahead`}
                  <input
                    type="range"
                    min="0"
                    max="52"
                    step={view === "fortnight" ? "2" : "1"}
                    value={planningOffsetWeeks}
                    onChange={(event) => jumpPlanningOffset(Number(event.target.value))}
                    className="w-full accent-teal-700"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => jumpPlanningOffset(0)} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-teal-400">Current week</button>
                <button type="button" onClick={() => moveCalendar(-1)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-teal-400">
                  <ChevronLeft size={16} aria-hidden="true" />Previous
                </button>
                <button type="button" onClick={() => moveCalendar(1)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-teal-400">
                  Next<ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </Card>
        ) : null}

        {view === "day" ? (
          <RosterDayView date={selectedDate} shifts={visibleShifts} onOpenShift={setActiveShift} />
        ) : view === "week" || view === "fortnight" ? (
          <RosterWeekView selectedDate={selectedDate} span={view} shifts={rosterSheetShifts} workers={allRosterWorkers} onOpenShift={setActiveShift} onCreateShift={({ shiftDate, workerId }) => openCreateShift({ shiftDate, workerIds: workerId ? [workerId] : [] })} />
        ) : (
          <RosterPlanningOverview selectedDate={selectedDate} view={view} shifts={visibleShifts} onSelectDate={openWeek} />
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

function parseRosterCsv(text: string, clients: Array<{ id: string; name: string; profilePhotoPath?: string }>, staff: Array<{ id: string; name: string }>) {
  const [headerRow, ...dataRows] = parseCsvRows(text);
  if (!headerRow?.length) return { shifts: [] as RosterShift[], warning: "The CSV file is empty." };
  const headers = headerRow.map((value) => normaliseHeading(value));
  const clientByName = new Map(clients.map((client) => [normaliseLookup(client.name), client]));
  const staffByName = new Map(staff.map((worker) => [normaliseLookup(worker.name), worker]));
  const warnings: string[] = [];

  const shifts = dataRows.map((row, index): RosterShift | null => {
    const value = (...names: string[]) => {
      const headingIndex = names.map(normaliseHeading).map((name) => headers.indexOf(name)).find((position) => position >= 0);
      return headingIndex === undefined ? "" : row[headingIndex]?.trim() || "";
    };
    const shiftDate = normaliseDate(value("date", "shift date", "service date"));
    const startTime = normaliseTime(value("start", "start time", "from"));
    const endTime = normaliseTime(value("end", "finish", "finish time", "to"));
    const clientName = value("client", "participant", "person", "customer") || "Imported client";
    const workerName = value("staff", "worker", "employee", "assigned staff") || "Unassigned";
    const client = clientByName.get(normaliseLookup(clientName));
    const worker = staffByName.get(normaliseLookup(workerName));
    if (!shiftDate || !startTime || !endTime) {
      warnings.push(`Row ${index + 2} missing date or time`);
      return null;
    }
    if (!client) warnings.push(`Row ${index + 2} client not matched`);
    if (workerName !== "Unassigned" && !worker) warnings.push(`Row ${index + 2} staff not matched`);

    return {
      id: `imported-${shiftDate}-${startTime}-${normaliseLookup(clientName).replace(/[^a-z0-9]+/g, "-")}-${index}`,
      participantId: client?.id || "imported-client",
      participantName: client?.name || clientName,
      participantPhotoPath: client?.profilePhotoPath,
      workerId: worker?.id || "",
      workerName: worker?.name || workerName,
      assignedWorkers: worker ? [worker] : [],
      staffingRatio: value("ratio", "staffing ratio") || "1:1",
      supportType: value("support type", "service", "shift type") || "Imported support",
      shiftDate,
      startTime,
      endTime,
      location: value("location", "address", "house", "service location") || "Imported location",
      shiftInstructions: value("instructions", "notes", "shift instructions") || "Imported from external roster.",
      status: "Scheduled",
      noteRequired: true,
      noteCompleted: false
    };
  }).filter((shift): shift is RosterShift => Boolean(shift));

  return {
    shifts,
    warning: Array.from(new Set(warnings)).slice(0, 4).join("; ")
  };
}

function mergeRosterShifts(existing: RosterShift[], imported: RosterShift[]) {
  const next = new Map(existing.map((shift) => [shift.id, shift]));
  imported.forEach((shift) => next.set(shift.id, shift));
  return Array.from(next.values()).sort((first, second) => `${first.shiftDate} ${first.startTime}`.localeCompare(`${second.shiftDate} ${second.startTime}`));
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normaliseHeading(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normaliseLookup(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normaliseDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return "";
  const [, day, month, rawYear] = match;
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normaliseTime(value: string) {
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = match[2] || "00";
  const period = match[3];
  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  if (hour > 23 || Number(minute) > 59) return "";
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function getRosterPdfColour(shift: RosterShift) {
  const coverage = getRosterCoverageColour(shift);
  if (coverage.label === "Vacant / cancelled") {
    return { label: coverage.label, border: "#dc2626", background: "#fef2f2", pill: "#dc2626", text: "#7f1d1d" };
  }
  if (coverage.label === "Unassigned") {
    return { label: coverage.label, border: "#f59e0b", background: "#fffbeb", pill: "#f59e0b", text: "#78350f" };
  }
  return { label: coverage.label, border: "#0284c7", background: "#eff6ff", pill: "#0284c7", text: "#0c4a6e" };
}

function printRosterPdf({ title, filename, organisationProfile, period, mode, rows }: {
  title: string;
  filename: string;
  organisationProfile: OrganisationProfile;
  period: string;
  mode: string;
  rows: Array<{ shift: RosterShift; colour: ReturnType<typeof getRosterPdfColour> }>;
}) {
  const generatedAt = new Date().toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
  const organisationName = organisationProfile.organisationName || "Organisation";
  const showBranding = organisationProfile.includeInDownloads;
  const logo = showBranding && organisationProfile.logoDataUrl
    ? `<img src="${escapeRosterHtml(organisationProfile.logoDataUrl)}" alt="${escapeRosterHtml(organisationName)} logo" class="logo" />`
    : "";
  const organisationDetails = [
    organisationName,
    organisationProfile.abn ? `ABN: ${organisationProfile.abn}` : "",
    organisationProfile.providerNumber ? `NDIS provider number: ${organisationProfile.providerNumber}` : "",
    organisationProfile.phone ? `Phone: ${organisationProfile.phone}` : "",
    organisationProfile.email ? `Email: ${organisationProfile.email}` : "",
    organisationProfile.website ? `Website: ${organisationProfile.website}` : "",
    organisationProfile.address ? `Address: ${organisationProfile.address}` : ""
  ].filter(Boolean);
  const totalHours = getRosterPdfHours(rows.map((row) => row.shift));
  const rowHtml = rows.length ? rows.map(({ shift, colour }) => `
    <tr style="border-left: 6px solid ${colour.border}; background: ${colour.background}; color: ${colour.text};">
      <td><strong>${escapeRosterHtml(formatRosterDate(shift.shiftDate))}</strong><span>${escapeRosterHtml(`${shift.startTime} - ${shift.endTime}`)}</span></td>
      <td><strong>${escapeRosterHtml(shift.participantName)}</strong><span>${escapeRosterHtml(shift.location)}</span></td>
      <td><strong>${escapeRosterHtml(getShiftStaffLabel(shift))}</strong><span>${escapeRosterHtml(shift.staffingRatio || "1:1")}</span></td>
      <td><strong>${escapeRosterHtml(formatRosterPdfHours(getShiftDurationHours(shift.startTime, shift.endTime)))}</strong><span>${escapeRosterHtml(shift.supportType)}</span></td>
      <td><strong>${escapeRosterHtml(shift.shiftInstructions || "No additional instructions recorded.")}</strong></td>
      <td><span class="status" style="background: ${colour.pill};">${escapeRosterHtml(colour.label)}</span><span>${escapeRosterHtml(shift.noteRequired ? (shift.noteCompleted ? "Note completed" : "Note required") : "Note not required")}</span></td>
    </tr>
  `).join("") : `<tr><td colspan="6" class="empty">No roster shifts are recorded for this period.</td></tr>`;
  const documentHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeRosterHtml(filenameWithoutExtension(filename))}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8fafc; color: #102a33; font-family: Arial, Helvetica, sans-serif; }
    main { min-height: 100vh; padding: 24px; background: #ffffff; }
    header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 4px solid #1f8a86; padding-bottom: 16px; }
    h1 { margin: 0; color: #073b44; font-size: 28px; letter-spacing: 0; }
    .brand { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 14px; }
    .brand-details { color: #334155; font-size: 12px; line-height: 1.55; }
    .brand-name { color: #073b44; font-size: 16px; font-weight: 800; }
    .logo { max-width: 180px; max-height: 72px; object-fit: contain; }
    .subtitle { margin: 8px 0 0; color: #475569; font-size: 13px; line-height: 1.5; }
    .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
    .meta div { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
    .meta span, td span { display: block; color: #475569; font-size: 11px; line-height: 1.45; margin-top: 4px; }
    .meta strong { display: block; font-size: 13px; color: #102a33; }
    .legend { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
    .legend span { display: inline-flex; align-items: center; gap: 7px; border-radius: 999px; padding: 7px 10px; font-size: 12px; font-weight: 700; }
    .dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
    table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
    th { color: #475569; font-size: 11px; text-transform: uppercase; text-align: left; padding: 0 10px 4px; letter-spacing: .04em; }
    td { padding: 12px 10px; vertical-align: top; border-top: 1px solid #dbeafe; border-bottom: 1px solid #dbeafe; font-size: 12px; line-height: 1.4; }
    td:first-child { border-radius: 8px 0 0 8px; border-left: 1px solid #dbeafe; }
    td:last-child { border-radius: 0 8px 8px 0; border-right: 1px solid #dbeafe; }
    td strong { display: block; color: inherit; font-size: 13px; }
    tfoot td { background: #f1f5f9; border-color: #94a3b8; color: #073b44; font-size: 13px; }
    .status { display: inline-flex; border-radius: 999px; color: white; font-size: 11px; font-weight: 800; padding: 6px 8px; margin-bottom: 4px; }
    .empty { text-align: center; color: #475569; border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; padding: 26px; }
    footer { margin-top: 16px; color: #64748b; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    @media print { body { background: #ffffff; } main { padding: 0; } }
  </style>
</head>
<body>
  <main>
    ${showBranding ? `<section class="brand"><div class="brand-details">${organisationDetails.map((item, index) => index === 0 ? `<div class="brand-name">${escapeRosterHtml(item)}</div>` : escapeRosterHtml(item)).join("<br />")}</div>${logo}</section>` : `<section class="brand"><div class="brand-details"><div class="brand-name">${escapeRosterHtml(organisationName)}</div></div></section>`}
    <header>
      <div>
        <h1>${escapeRosterHtml(title)}</h1>
        <p class="subtitle">Colour-coded roster export for manager review, staff allocation, vacancies and shift documentation.</p>
      </div>
      <div class="subtitle"><strong>Generated</strong><br />${escapeRosterHtml(generatedAt)}</div>
    </header>
    <section class="meta">
      <div><span>Organisation</span><strong>${escapeRosterHtml(organisationName)}</strong></div>
      <div><span>Period</span><strong>${escapeRosterHtml(period)}</strong></div>
      <div><span>Roster source</span><strong>${escapeRosterHtml(mode)}</strong></div>
      <div><span>Total shifts / hours</span><strong>${rows.length} shifts · ${escapeRosterHtml(formatRosterPdfHours(totalHours))}</strong></div>
    </section>
    <section class="legend" aria-label="Roster colour legend">
      <span style="background:#eff6ff;color:#0c4a6e;"><i class="dot" style="background:#0284c7;"></i>Assigned shift</span>
      <span style="background:#fffbeb;color:#78350f;"><i class="dot" style="background:#f59e0b;"></i>Unassigned shift</span>
      <span style="background:#fef2f2;color:#7f1d1d;"><i class="dot" style="background:#dc2626;"></i>Vacant or cancelled</span>
    </section>
    <table>
      <thead><tr><th>Date / time</th><th>Client / location</th><th>Staff / ratio</th><th>Hours / support</th><th>Instructions</th><th>Status</th></tr></thead>
      <tbody>${rowHtml}</tbody>
      <tfoot><tr><td colspan="3"><strong>Roster period total</strong></td><td><strong>${escapeRosterHtml(formatRosterPdfHours(totalHours))}</strong></td><td colspan="2"><span>Total excludes cancelled and no-show shifts.</span></td></tr></tfoot>
    </table>
    <footer>Generated by EmpowerNotes. Confirm all roster details against the provider record before payroll, billing, audit or external sharing.</footer>
  </main>
</body>
</html>`;
  return printRosterHtml(filename, documentHtml);
}

function printRosterHtml(filename: string, content: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";
  document.body.appendChild(frame);

  const printWindow = frame.contentWindow;
  const printDocument = frame.contentDocument;
  if (!printWindow || !printDocument) {
    frame.remove();
    return false;
  }

  printDocument.open();
  printDocument.write(content.replace(/<title>.*?<\/title>/, `<title>${escapeRosterHtml(filenameWithoutExtension(filename))}</title>`));
  printDocument.close();
  const cleanup = () => window.setTimeout(() => frame.remove(), 500);
  printWindow.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    window.setTimeout(cleanup, 60_000);
  }, 500);
  return true;
}

function formatRosterDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function getRosterPdfHours(shifts: RosterShift[]) {
  return Math.round(shifts
    .filter((shift) => shift.status !== "Cancelled" && shift.status !== "No Show")
    .reduce((total, shift) => total + getShiftDurationHours(shift.startTime, shift.endTime), 0) * 100) / 100;
}

function formatRosterPdfHours(hours: number) {
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} hours`;
}

function filenameWithoutExtension(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, "");
}

function slugifyFilename(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "organisation";
}

function escapeRosterHtml(value: string | number) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
