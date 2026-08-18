"use client";

import { useEffect, useState } from "react";
import { ArchiveRestore, Check, PauseCircle, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getStoredAccessToken } from "@/lib/supabase-rest";

type Schedule = { id: string; record_class: string; retention_years: number; proposed_action: string; status: string; basis: string; basis_url: string };
type Hold = { id: string; participant_id: string | null; record_class: string | null; reason: string; reference: string; status: string; review_on: string | null; created_at: string };
type Candidate = { id: string; participant_id: string | null; record_class: string; source_table: string; recorded_at: string; eligible_at: string; proposed_action: string; status: string };
type Job = { id: string; candidate_id: string; requested_action: string; status: string; requested_at: string };
type Participant = { id: string; name: string; status: string };
type LifecycleData = { schedules: Schedule[]; holds: Hold[]; queue: Candidate[]; jobs: Job[]; participants: Participant[]; executionEnabled: boolean };

const classLabels: Record<string, string> = {
  care_records: "Care records",
  incident_records: "Incident records",
  restrictive_practice_records: "Restrictive practices",
  billing_records: "Billing records",
  document_records: "Documents",
  workforce_records: "Workforce records"
};

export function DataLifecyclePanel() {
  const [data, setData] = useState<LifecycleData>({ schedules: [], holds: [], queue: [], jobs: [], participants: [], executionEnabled: false });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [holdForm, setHoldForm] = useState({ participantId: "", recordClass: "", reason: "", reference: "", reviewOn: "" });
  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const token = getStoredAccessToken();
    const response = await fetch("/api/admin/data-lifecycle", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const result = await response.json() as LifecycleData & { error?: string };
    if (response.ok) setData(result);
    else setMessage(result.error || "Data lifecycle records could not be loaded.");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function runAction(body: Record<string, unknown>, success: string) {
    setMessage("");
    const response = await fetch("/api/admin/data-lifecycle", {
      method: "POST",
      headers: { Authorization: `Bearer ${getStoredAccessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? success : result.error || "The lifecycle action could not be saved.");
    if (response.ok) await load();
    return response.ok;
  }

  async function saveSchedule(schedule: Schedule) {
    await runAction({ action: "save_schedule", recordClass: schedule.record_class, retentionYears: schedule.retention_years, proposedAction: schedule.proposed_action, status: schedule.status, basis: schedule.basis, basisUrl: schedule.basis_url }, `${classLabels[schedule.record_class]} schedule saved.`);
  }

  async function createHold() {
    const saved = await runAction({ action: "create_hold", ...holdForm }, "Legal hold created.");
    if (saved) setHoldForm({ participantId: "", recordClass: "", reason: "", reference: "", reviewOn: "" });
  }

  function updateSchedule(id: string, field: keyof Schedule, value: string | number) {
    setData((current) => ({ ...current, schedules: current.schedules.map((schedule) => schedule.id === id ? { ...schedule, [field]: value } : schedule) }));
  }

  const activeHolds = data.holds.filter((hold) => hold.status === "active");
  const openQueue = data.queue.filter((candidate) => ["pending", "held"].includes(candidate.status));

  return (
    <Card className="md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Data lifecycle</p>
          <h2 className="mt-1 text-xl font-bold text-ink">Retention and legal holds</h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={`${activeHolds.length} holds`} tone={activeHolds.length ? "amber" : "green"} />
          <StatusBadge label={`${openQueue.length} due`} tone={openQueue.length ? "blue" : "slate"} />
          <button type="button" onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-teal-400" aria-label="Refresh data lifecycle records" title="Refresh">
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          </button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-teal-800" role="status">{message}</p> : null}

      <div className="mt-6 border-t border-slate-200 pt-5">
        <h3 className="text-base font-bold text-ink">Schedules</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2 pr-3">Record class</th><th className="pb-2 pr-3">Years</th><th className="pb-2 pr-3">Action</th><th className="pb-2 pr-3">Status</th><th className="pb-2 text-right">Save</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.schedules.map((schedule) => <tr key={schedule.id}>
                <td className="py-3 pr-3"><p className="font-semibold text-ink">{classLabels[schedule.record_class]}</p><p className="max-w-md text-xs leading-5 text-slate-500">{schedule.basis}</p></td>
                <td className="py-3 pr-3"><input type="number" min={1} max={30} value={schedule.retention_years} onChange={(event) => updateSchedule(schedule.id, "retention_years", Number(event.target.value))} className="h-10 w-20 rounded-md border border-slate-300 px-3" aria-label={`${classLabels[schedule.record_class]} retention years`} /></td>
                <td className="py-3 pr-3"><select value={schedule.proposed_action} onChange={(event) => updateSchedule(schedule.id, "proposed_action", event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3"><option value="review">Review only</option><option value="deidentify">De-identify</option><option value="delete">Delete</option></select></td>
                <td className="py-3 pr-3"><select value={schedule.status} onChange={(event) => updateSchedule(schedule.id, "status", event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3"><option value="draft">Draft</option><option value="approved">Approved</option><option value="paused">Paused</option></select></td>
                <td className="py-3 text-right"><button type="button" onClick={() => void saveSchedule(schedule)} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-sea px-3 text-sm font-semibold text-white hover:bg-teal-800"><Check size={15} />Save</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-6 border-t border-slate-200 pt-5 lg:grid-cols-2">
        <section>
          <h3 className="flex items-center gap-2 text-base font-bold text-ink"><ShieldAlert size={18} />Create legal hold</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Client scope<select value={holdForm.participantId} onChange={(event) => setHoldForm((current) => ({ ...current, participantId: event.target.value }))} className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3"><option value="">All clients</option>{data.participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700">Record scope<select value={holdForm.recordClass} onChange={(event) => setHoldForm((current) => ({ ...current, recordClass: event.target.value }))} className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3"><option value="">All records</option>{Object.entries(classLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Reason<textarea value={holdForm.reason} onChange={(event) => setHoldForm((current) => ({ ...current, reason: event.target.value }))} rows={2} className="mt-1 w-full rounded-md border border-slate-300 p-3" /></label>
            <label className="text-sm font-semibold text-slate-700">Reference<input value={holdForm.reference} onChange={(event) => setHoldForm((current) => ({ ...current, reference: event.target.value }))} className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3" /></label>
            <label className="text-sm font-semibold text-slate-700">Review date<input type="date" value={holdForm.reviewOn} onChange={(event) => setHoldForm((current) => ({ ...current, reviewOn: event.target.value }))} className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3" /></label>
          </div>
          <button type="button" onClick={() => void createHold()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white hover:bg-teal-800"><Plus size={16} />Create hold</button>
        </section>
        <section>
          <h3 className="flex items-center gap-2 text-base font-bold text-ink"><PauseCircle size={18} />Active holds</h3>
          <div className="mt-3 divide-y divide-slate-100 border-y border-slate-200">
            {activeHolds.length ? activeHolds.map((hold) => <div key={hold.id} className="py-3">
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-ink">{hold.record_class ? classLabels[hold.record_class] : "All records"}</p><p className="text-sm text-slate-600">{hold.reason}</p></div><StatusBadge label="Active" tone="amber" /></div>
              <div className="mt-2 flex gap-2"><input value={reasons[`hold-${hold.id}`] || ""} onChange={(event) => setReasons((current) => ({ ...current, [`hold-${hold.id}`]: event.target.value }))} placeholder="Release reason" className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm" /><button type="button" onClick={() => void runAction({ action: "release_hold", holdId: hold.id, reason: reasons[`hold-${hold.id}`] || "" }, "Legal hold released.")} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold">Release</button></div>
            </div>) : <p className="py-4 text-sm text-slate-600">No active legal holds.</p>}
          </div>
        </section>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-base font-bold text-ink"><ArchiveRestore size={18} />Due for review</h3><p className="text-xs font-semibold text-slate-500">Approved destructive jobs remain paused.</p></div>
        <div className="mt-3 divide-y divide-slate-100 border-y border-slate-200">
          {openQueue.length ? openQueue.slice(0, 20).map((candidate) => <div key={candidate.id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-ink">{classLabels[candidate.record_class]}</p><p className="text-sm text-slate-600">Eligible {candidate.eligible_at} · {candidate.source_table.replaceAll("_", " ")}</p></div><StatusBadge label={candidate.status === "held" ? "Legal hold" : candidate.proposed_action} tone={candidate.status === "held" ? "amber" : "blue"} /></div>
            {candidate.status !== "held" ? <div className="mt-3 flex flex-wrap gap-2"><input value={reasons[candidate.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [candidate.id]: event.target.value }))} placeholder="Decision reason" className="h-10 min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 text-sm" /><button type="button" onClick={() => void runAction({ action: "review_candidate", candidateId: candidate.id, decision: candidate.proposed_action === "review" ? "reviewed" : "approve", reason: reasons[candidate.id] || "" }, "Retention review saved.")} className="min-h-10 rounded-md bg-sea px-3 text-sm font-semibold text-white">Approve</button><button type="button" onClick={() => void runAction({ action: "review_candidate", candidateId: candidate.id, decision: "exempt", reason: reasons[candidate.id] || "" }, "Retention exception recorded.")} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold">Exempt</button></div> : null}
          </div>) : <p className="py-4 text-sm text-slate-600">No records are currently due for review.</p>}
        </div>
        {data.jobs.length ? <p className="mt-3 text-sm text-slate-600">{data.jobs.filter((job) => job.status === "approved").length} approved action job(s) await controlled execution.</p> : null}
      </div>
    </Card>
  );
}
