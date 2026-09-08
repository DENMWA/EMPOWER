"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Mail, Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import { AvailabilityDocumentWorkflow } from "@/components/roster/AvailabilityDocumentWorkflow";
import { StaffAvailabilityMap } from "@/components/roster/StaffAvailabilityMap";
import { WeeklyAvailabilityGrid } from "@/components/roster/WeeklyAvailabilityGrid";
import { loadStaffAvailability, saveWeeklyAvailabilityGrid } from "@/lib/roster-intelligence-cloud";
import { recommendStaffForShift, type StaffAvailability } from "@/lib/roster-intelligence";
import type { RosterShift } from "@/lib/roster";
import { getTenantStaffInvites, isStaffActiveForRostering, type StaffRecord } from "@/lib/staff-records";
import { getStoredAccessToken } from "@/lib/supabase-rest";

export function RosterIntelligencePanel({
  shifts,
  selectedDate,
  replacementShiftId,
  onAssign,
  onCoverageChange
}: {
  shifts: RosterShift[];
  selectedDate: string;
  replacementShiftId?: string;
  onAssign: (shiftId: string, worker: { id: string; name: string }) => void;
  onCoverageChange?: (uncoveredCount: number, readyCount: number) => void;
}) {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [availability, setAvailability] = useState<StaffAvailability[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [message, setMessage] = useState("Loading availability...");
  const [offering, setOffering] = useState("");

  useEffect(() => {
    Promise.all([getTenantStaffInvites(), loadStaffAvailability()]).then(([workers, result]) => {
      setStaff(workers.filter(isStaffActiveForRostering));
      setAvailability(result.records);
      setSelectedStaffId(workers.find(isStaffActiveForRostering)?.id || "");
      setMessage(result.error || "Availability connected to workspace.");
    });
  }, []);

  const candidateShifts = useMemo(() => shifts.filter((shift) => !["Completed", "Note Completed", "No Show"].includes(shift.status)), [shifts]);
  const selectedShift = candidateShifts.find((shift) => shift.id === selectedShiftId) || null;
  const recommendations = selectedShift ? recommendStaffForShift({ shift: selectedShift, staff, availability, shifts }) : [];
  const unassignedShifts = useMemo(() => candidateShifts
    .filter((shift) => !shift.workerId && !shift.assignedWorkers?.length && !["Cancelled", "No Show"].includes(shift.status)), [candidateShifts]);
  const unassignedWithRecommendations = useMemo(() => unassignedShifts
    .map((shift) => ({ shift, shiftRecommendations: recommendStaffForShift({ shift, staff, availability, shifts }) })), [availability, unassignedShifts, shifts, staff]);
  const allDraftRecommendations = useMemo(() => unassignedWithRecommendations
    .map(({ shift, shiftRecommendations }) => ({ shift, recommendation: shiftRecommendations.find((item) => item.eligible) }))
    .filter((item) => Boolean(item.recommendation)), [unassignedWithRecommendations]);
  const allUncoveredShifts = useMemo(() => unassignedWithRecommendations
    .filter(({ shiftRecommendations }) => !shiftRecommendations.some((item) => item.eligible))
    .map(({ shift }) => shift), [unassignedWithRecommendations]);
  const draftRecommendations = allDraftRecommendations.slice(0, 6);
  const uncoveredShifts = allUncoveredShifts.slice(0, 8);

  useEffect(() => {
    onCoverageChange?.(allUncoveredShifts.length, allDraftRecommendations.length);
  }, [allUncoveredShifts.length, allDraftRecommendations.length, onCoverageChange]);

  useEffect(() => {
    if (replacementShiftId && candidateShifts.some((shift) => shift.id === replacementShiftId)) {
      setSelectedShiftId(replacementShiftId);
    }
  }, [candidateShifts, replacementShiftId]);

  async function sendOffer(recommendation: { staffId: string; staffName: string }) {
    if (!selectedShift) return;
    setOffering(recommendation.staffId);
    const token = getStoredAccessToken();
    const response = await fetch("/api/roster/replacement-offers", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId: selectedShift.id, staffInviteId: recommendation.staffId })
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? `Offer sent to ${recommendation.staffName}.` : result.error || "Offer could not be sent.");
    setOffering("");
  }

  return (
    <details id="roster-intelligence-panel" className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Availability and AI tools</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Draft roster recommendations</h2>
          </div>
          <span className="flex gap-2">
            <span className="rounded-md bg-teal-50 px-3 py-2 text-sm font-bold text-teal-900">{allDraftRecommendations.length} ready</span>
            {allUncoveredShifts.length ? <span className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{allUncoveredShifts.length} need coverage</span> : null}
          </span>
        </div>
      </summary>
      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-slate-200 shadow-none">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Availability</p><h2 className="mt-1 text-xl font-bold text-ink">Staff availability</h2></div>
        </div>
        <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">Staff<select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3">{staff.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></label>
        {selectedStaffId ? (
          <div className="mt-4">
            <WeeklyAvailabilityGrid
              key={selectedStaffId}
              initialEntries={availability.filter((item) => item.staffInviteId === selectedStaffId && item.weekday !== null).map((item) => ({ weekday: item.weekday as number, startTime: item.startTime, endTime: item.endTime, kind: item.kind }))}
              onSave={async (grid) => {
                const result = await saveWeeklyAvailabilityGrid(selectedStaffId, grid);
                if (result.saved) {
                  const refreshed = await loadStaffAvailability();
                  setAvailability(refreshed.records);
                }
                return result;
              }}
            />
          </div>
        ) : null}
      </Card>

      <Card className="border-slate-200 shadow-none">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-teal-50 text-teal-800"><BrainCircuit size={20} /></span><div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Roster intelligence</p><h2 className="mt-1 text-xl font-bold text-ink">Coverage recommendations</h2></div></div>
        {draftRecommendations.length ? (
          <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3">
            <p className="text-sm font-bold text-teal-950">Draft roster</p>
            <div className="mt-3 space-y-2">
              {draftRecommendations.map(({ shift, recommendation }) => recommendation ? (
                <div key={shift.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-ink">{shift.shiftDate} {shift.startTime}-{shift.endTime} · {shift.participantName}</p>
                    <p className="text-slate-600">{recommendation.staffName} · {recommendation.reasons[0]}</p>
                  </div>
                  <button type="button" onClick={() => onAssign(shift.id, { id: recommendation.staffId, name: recommendation.staffName })} className="min-h-9 rounded-md bg-ink px-3 text-xs font-semibold text-white">Accept</button>
                </div>
              ) : null)}
            </div>
          </div>
        ) : null}
        {uncoveredShifts.length ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-bold text-red-950">No coverage — no staff currently show confirmed availability</p>
            <div className="mt-3 space-y-2">
              {uncoveredShifts.map((shift) => (
                <button key={shift.id} type="button" onClick={() => setSelectedShiftId(shift.id)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-left text-sm hover:border-red-300">
                  <p className="font-semibold text-ink">{shift.shiftDate} {shift.startTime}-{shift.endTime} · {shift.participantName}</p>
                  <span className="text-xs font-semibold text-red-700">Review candidates →</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">Shift<select value={selectedShiftId} onChange={(event) => setSelectedShiftId(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3"><option value="">Choose a shift</option>{candidateShifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.shiftDate} - {shift.startTime} - {shift.participantName}{shift.status === "Cancelled" ? " - cancelled" : !shift.workerId && !shift.assignedWorkers?.length ? " - unassigned" : ""}</option>)}</select></label>
        {!selectedShift ? <p className="mt-4 text-sm text-slate-600">Choose a shift to rank eligible staff.</p> : null}
        <div className="mt-4 space-y-3">{recommendations.slice(0, 5).map((item) => <div key={item.staffId} className={`rounded-md border p-4 ${item.eligible ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-slate-50"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-ink">{item.staffName}</p><p className="mt-1 text-sm text-slate-600">{item.reasons.join(" · ")}</p>{item.warnings.length ? <p className="mt-2 text-xs font-semibold text-amber-800">Review: {item.warnings.join(" · ")}</p> : null}</div><span className="inline-flex items-center gap-1 text-sm font-bold text-teal-800"><Sparkles size={15} />{item.score}</span></div><div className="mt-3 flex flex-wrap gap-2">{item.eligible ? (
          <button type="button" onClick={() => onAssign(selectedShift!.id, { id: item.staffId, name: item.staffName })} className="min-h-10 rounded-md bg-ink px-3 text-sm font-semibold text-white">Assign</button>
        ) : item.hardBlocked ? (
          <button type="button" disabled className="min-h-10 rounded-md bg-ink px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Assign</button>
        ) : (
          <button type="button" onClick={() => { if (window.confirm(`${item.staffName}'s availability doesn't confirm coverage for this shift. Assign anyway?`)) onAssign(selectedShift!.id, { id: item.staffId, name: item.staffName }); }} className="min-h-10 rounded-md border border-amber-400 bg-amber-50 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100">Assign anyway</button>
        )}<button type="button" disabled={!item.eligible || offering === item.staffId} onClick={() => sendOffer(item)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink disabled:opacity-40"><Mail size={16} />Send Y/N offer</button></div></div>)}</div>
        <p className="mt-4 text-xs leading-5 text-slate-500">&quot;Assign anyway&quot; is available when availability just hasn&apos;t been confirmed on file. It&apos;s not offered for suspended access, staff marked unavailable, or a conflicting shift — those require resolving the underlying issue first.</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Recommendations are advisory. Managers remain responsible for suitability, award conditions, fatigue and final publication.</p>
      </Card>
      <AvailabilityDocumentWorkflow
        staffInviteId={selectedStaffId}
        staffName={staff.find((item) => item.id === selectedStaffId)?.name || ""}
        onPublished={(records) => setAvailability((current) => [...current, ...records])}
      />
      <p className="xl:col-span-2 text-sm font-semibold text-slate-600" role="status">{message}</p>
      <StaffAvailabilityMap staff={staff} availability={availability} shifts={shifts} selectedDate={selectedDate} />
      </div>
    </details>
  );
}
