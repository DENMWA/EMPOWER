"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Check, Mail, Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import { AvailabilityDocumentWorkflow } from "@/components/roster/AvailabilityDocumentWorkflow";
import { StaffAvailabilityMap } from "@/components/roster/StaffAvailabilityMap";
import { loadStaffAvailability, saveStaffAvailability } from "@/lib/roster-intelligence-cloud";
import { recommendStaffForShift, type AvailabilityKind, type StaffAvailability } from "@/lib/roster-intelligence";
import type { RosterShift } from "@/lib/roster";
import { getTenantStaffInvites, type StaffRecord } from "@/lib/staff-records";
import { getStoredAccessToken } from "@/lib/supabase-rest";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function RosterIntelligencePanel({
  shifts,
  selectedDate,
  replacementShiftId,
  onAssign
}: {
  shifts: RosterShift[];
  selectedDate: string;
  replacementShiftId?: string;
  onAssign: (shiftId: string, worker: { id: string; name: string }) => void;
}) {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [availability, setAvailability] = useState<StaffAvailability[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [kind, setKind] = useState<AvailabilityKind>("available");
  const [message, setMessage] = useState("Loading availability...");
  const [offering, setOffering] = useState("");

  useEffect(() => {
    Promise.all([getTenantStaffInvites(), loadStaffAvailability()]).then(([workers, result]) => {
      setStaff(workers);
      setAvailability(result.records);
      setSelectedStaffId(workers[0]?.id || "");
      setMessage(result.error || "Availability connected to workspace.");
    });
  }, []);

  const candidateShifts = useMemo(() => shifts.filter((shift) => !["Completed", "Note Completed", "No Show"].includes(shift.status)), [shifts]);
  const selectedShift = candidateShifts.find((shift) => shift.id === selectedShiftId) || null;
  const recommendations = selectedShift ? recommendStaffForShift({ shift: selectedShift, staff, availability, shifts }) : [];

  useEffect(() => {
    if (replacementShiftId && candidateShifts.some((shift) => shift.id === replacementShiftId)) {
      setSelectedShiftId(replacementShiftId);
    }
  }, [candidateShifts, replacementShiftId]);

  async function addAvailability() {
    if (!selectedStaffId || endTime <= startTime) {
      setMessage("Select staff and add a valid time window.");
      return;
    }
    const record: StaffAvailability = {
      id: crypto.randomUUID(), staffInviteId: selectedStaffId, weekday, specificDate: null,
      startTime, endTime, kind, recurring: true, notes: ""
    };
    const result = await saveStaffAvailability(record);
    if (result.saved && result.record) setAvailability((current) => [...current, result.record!]);
    setMessage(result.saved ? "Availability saved." : result.error || "Availability could not be saved.");
  }

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
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Availability</p><h2 className="mt-1 text-xl font-bold text-ink">Staff availability</h2></div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">Staff<select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3">{staff.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Day<select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))} className="min-h-11 rounded-md border border-slate-300 px-3">{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Status<select value={kind} onChange={(event) => setKind(event.target.value as AvailabilityKind)} className="min-h-11 rounded-md border border-slate-300 px-3"><option value="available">Available</option><option value="preferred">Preferred</option><option value="unavailable">Unavailable</option></select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">From<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">To<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3" /></label>
        </div>
        <button type="button" onClick={addAvailability} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white"><Check size={17} />Save availability</button>
        <div className="mt-4 space-y-2">{availability.filter((item) => item.staffInviteId === selectedStaffId).map((item) => <div key={item.id} className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold text-ink">{item.specificDate || weekdays[item.weekday ?? 0]}</span><span className="text-slate-600">{item.startTime}-{item.endTime} · {item.kind}</span></div>)}</div>
      </Card>

      <Card>
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-teal-50 text-teal-800"><BrainCircuit size={20} /></span><div><p className="text-sm font-semibold uppercase tracking-wide text-sea">Roster intelligence</p><h2 className="mt-1 text-xl font-bold text-ink">Coverage recommendations</h2></div></div>
        <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">Shift<select value={selectedShiftId} onChange={(event) => setSelectedShiftId(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3"><option value="">Choose a shift</option>{candidateShifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.shiftDate} - {shift.startTime} - {shift.participantName}{shift.status === "Cancelled" ? " - cancelled" : !shift.workerId && !shift.assignedWorkers?.length ? " - unassigned" : ""}</option>)}</select></label>
        {!selectedShift ? <p className="mt-4 text-sm text-slate-600">Choose a shift to rank eligible staff.</p> : null}
        <div className="mt-4 space-y-3">{recommendations.slice(0, 5).map((item) => <div key={item.staffId} className={`rounded-md border p-4 ${item.eligible ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-slate-50"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-ink">{item.staffName}</p><p className="mt-1 text-sm text-slate-600">{item.reasons.join(" · ")}</p>{item.warnings.length ? <p className="mt-2 text-xs font-semibold text-amber-800">Review: {item.warnings.join(" · ")}</p> : null}</div><span className="inline-flex items-center gap-1 text-sm font-bold text-teal-800"><Sparkles size={15} />{item.score}</span></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!item.eligible} onClick={() => onAssign(selectedShift!.id, { id: item.staffId, name: item.staffName })} className="min-h-10 rounded-md bg-ink px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Assign</button><button type="button" disabled={!item.eligible || offering === item.staffId} onClick={() => sendOffer(item)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink disabled:opacity-40"><Mail size={16} />Send Y/N offer</button></div></div>)}</div>
        <p className="mt-4 text-xs leading-5 text-slate-500">Recommendations are advisory. Managers remain responsible for suitability, award conditions, fatigue and final publication.</p>
      </Card>
      <AvailabilityDocumentWorkflow
        staffInviteId={selectedStaffId}
        staffName={staff.find((item) => item.id === selectedStaffId)?.name || ""}
        onPublished={(records) => setAvailability((current) => [...current, ...records])}
      />
      <p className="xl:col-span-2 text-sm font-semibold text-slate-600" role="status">{message}</p>
      <StaffAvailabilityMap staff={staff} availability={availability} shifts={shifts} selectedDate={selectedDate} />
    </div>
  );
}
