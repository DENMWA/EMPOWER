"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getTenantHouses, type HouseRecord } from "@/lib/house-records";
import { getSavedIncidentReports, saveIncidentReport, type IncidentEscalationPriority, type IncidentStatus, type StoredIncidentReport } from "@/lib/incident-records";

const reviewStatuses: IncidentStatus[] = ["Submitted", "Needs Review", "Locked"];
const escalationPriorities: IncidentEscalationPriority[] = ["Routine", "Urgent", "Critical"];
const escalationActionOptions = [
  "Client wellbeing follow-up",
  "Medical review or first-aid follow-up",
  "Notify family, guardian or nominee",
  "Notify senior manager",
  "Assess NDIS Commission notification",
  "Update risk assessment or support plan",
  "Staff debrief and practice review",
  "Property repair or environmental action"
];
const incidentBaselineTarget = 90;

function hasManagerAction(report: StoredIncidentReport) {
  const review = (report.managerReview || "").trim().toLowerCase();
  return report.status === "Locked" || Boolean(review && !review.startsWith("pending manager review"));
}

function getPercentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function getSuggestedPriority(report: StoredIncidentReport): IncidentEscalationPriority {
  if (report.incidentTypes.some((type) => ["Safeguarding concern", "Medical event"].includes(type))) return "Critical";
  if (report.incidentTypes.some((type) => ["Fall", "Injury", "Absconding / missing client", "Medication incident"].includes(type))) return "Urgent";
  return "Routine";
}

function IncidentBaselineChart({ reports, clients, houses }: { reports: StoredIncidentReport[]; clients: ClientRecord[]; houses: HouseRecord[] }) {
  const clientRows = useMemo(() => {
    const serviceKeys = new Set([
      ...houses.flatMap((house) => house.clientIds.map((clientId) => `${clientId}:${house.id}`)),
      ...clients.filter((client) => client.primaryHouseId).map((client) => `${client.id}:${client.primaryHouseId}`),
      ...reports.map((report) => `${report.participantId || "unassigned-client"}:${report.houseId || "unassigned-house"}`)
    ]);

    return Array.from(serviceKeys).map((serviceKey) => {
      const [clientId, houseId] = serviceKey.split(":");
      const client = clients.find((item) => item.id === clientId);
      const house = houses.find((item) => item.id === houseId);
      const clientReports = reports.filter((report) => (report.participantId || "unassigned-client") === clientId && (report.houseId || "unassigned-house") === houseId);
      const total = clientReports.length;
      const filed = clientReports.filter((report) => report.status !== "Draft").length;
      const actioned = clientReports.filter(hasManagerAction).length;
      const filedScore = getPercentage(filed, total);
      const actionedScore = getPercentage(actioned, total);
      const colour = getClientColourScheme(clientId, client?.colourSchemeId);
      const fallbackName = clientReports[0]?.participant || "Unassigned client";

      return {
        id: serviceKey,
        name: client?.name || fallbackName,
        houseName: house?.name || clientReports[0]?.houseName || "Unassigned house/service",
        colour,
        total,
        filed,
        actioned,
        filedScore,
        actionedScore
      };
    }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [clients, houses, reports]);

  const trackedRows = clientRows.filter((row) => row.total > 0);
  const clientsOnTarget = trackedRows.filter((row) => row.actionedScore >= incidentBaselineTarget).length;
  const strongestSignal = trackedRows.length && clientsOnTarget === trackedRows.length ? "All clients on target" : trackedRows.length ? `${clientsOnTarget} of ${trackedRows.length} on target` : "Waiting for incidents";

  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Incident baseline by client and house</p>
          <h3 className="mt-1 text-xl font-bold text-ink">Each service context compared against the 90% baseline</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">This live view keeps incident filing and manager action visible for each client at each house/service, so one service never masks another service&apos;s risk follow-up.</p>
        </div>
        <StatusBadge label={strongestSignal} tone={trackedRows.length && clientsOnTarget === trackedRows.length ? "green" : trackedRows.length ? "amber" : "blue"} />
      </div>

      <div className="mt-5 grid gap-3">
        {!clientRows.length ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-4">
            <p className="font-semibold text-ink">No clients to chart yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Add client profiles and houses in Admin, then submitted incidents will build a separate baseline chart for each service context.</p>
          </div>
        ) : null}

        {clientRows.map((row) => {
          const actionGap = Math.max(incidentBaselineTarget - row.actionedScore, 0);
          const tone = row.total === 0 ? "blue" : row.actionedScore >= incidentBaselineTarget ? "green" : row.filedScore >= incidentBaselineTarget ? "amber" : "red";

          return (
            <div key={row.id} className={`rounded-md border border-l-4 bg-white p-4 ${row.colour.border}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-ink">{row.name}</h4>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{row.houseName}</p>
                  <p className="mt-1 text-sm text-slate-600">{row.total ? `${row.filed} filed, ${row.actioned} actioned, ${actionGap}% action gap` : "No incident records yet"}</p>
                </div>
                <StatusBadge label={row.total ? `${row.actionedScore}% actioned` : "No data"} tone={tone} />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <IncidentScoreBar label="Filed" value={row.filedScore} count={`${row.filed}/${row.total}`} color="bg-sky-600" />
                <IncidentScoreBar label="Actioned" value={row.actionedScore} count={`${row.actioned}/${row.total}`} color="bg-emerald-600" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IncidentScoreBar({ label, value, count, color }: { label: string; value: number; count: string; color: string }) {
  const [selected, setSelected] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="font-bold text-ink">{value}%</span>
      </div>
      <button
        type="button"
        onClick={() => setSelected((current) => !current)}
        className={`relative block h-8 w-full overflow-hidden rounded-md bg-slate-100 text-left ring-1 transition hover:ring-teal-500 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${selected ? "ring-2 ring-teal-700" : "ring-slate-200"}`}
        aria-label={`${label}: ${value}%, ${count} incidents, target ${incidentBaselineTarget}%`}
        aria-pressed={selected}
      >
        <span className="absolute left-[90%] top-0 h-full w-px bg-amber-500" aria-hidden="true" />
        <span className={`block h-full rounded-md ${color}`} style={{ width: `${Math.min(value, 100)}%` }} aria-hidden="true" />
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600">
        <span>{count} incidents</span>
        <span>Target {incidentBaselineTarget}%</span>
      </div>
      {selected ? <p className="mt-2 rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900" aria-live="polite">{label}: {value}% ({count} incidents) against the {incidentBaselineTarget}% target.</p> : null}
    </div>
  );
}

export function IncidentReviewQueue() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [selectedHouseId, setSelectedHouseId] = useState("all");
  const [reports, setReports] = useState<StoredIncidentReport[]>([]);
  const [message, setMessage] = useState("");
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const clientMatch = selectedClientId === "all" || report.participantId === selectedClientId;
      const houseMatch = selectedHouseId === "all" || report.houseId === selectedHouseId;
      return clientMatch && houseMatch;
    });
  }, [reports, selectedClientId, selectedHouseId]);
  const queuedReports = useMemo(() => {
    const rank: Record<IncidentEscalationPriority, number> = { Critical: 0, Urgent: 1, Routine: 2 };
    return filteredReports
      .filter((report) => report.status === "Submitted" || report.status === "Needs Review")
      .sort((a, b) => rank[a.escalationPriority || getSuggestedPriority(a)] - rank[b.escalationPriority || getSuggestedPriority(b)] || b.date.localeCompare(a.date));
  }, [filteredReports]);

  useEffect(() => {
    getTenantClients().then(setClients).catch(() => setClients([]));
    getTenantHouses().then(setHouses).catch(() => setHouses([]));
    loadReports();
    window.addEventListener("empowernotes:retained-records-updated", loadReports);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadReports);
  }, []);

  async function loadReports() {
    const saved = await getSavedIncidentReports().catch(() => []);
    setReports(saved.map((item) => item.report));
  }

  function getReportKey(report: StoredIncidentReport) {
    return `${report.participantId}-${report.houseId || "unassigned-house"}-${report.incidentId}`;
  }

  function updateReport(reportKey: string, patch: Partial<StoredIncidentReport>) {
    setReports((current) => current.map((report) => getReportKey(report) === reportKey ? { ...report, ...patch } : report));
  }

  function toggleEscalationAction(reportKey: string, report: StoredIncidentReport, action: string) {
    const actions = report.escalationActions || [];
    updateReport(reportKey, {
      escalationActions: actions.includes(action) ? actions.filter((item) => item !== action) : [...actions, action]
    });
  }

  async function saveManagerResponse(report: StoredIncidentReport) {
    const nextReport = {
      ...report,
      escalationPriority: report.escalationPriority || getSuggestedPriority(report),
      status: report.status === "Submitted" ? "Needs Review" as const : report.status
    };
    const result = await saveIncidentReport(nextReport);
    const fullySaved = result.savedToCloud && result.savedToStructuredCloud;
    setMessage(fullySaved ? `${report.incidentId} escalation action saved.` : `${report.incidentId} escalation action was not fully saved. ${result.structuredError || result.error || "Sign in and try again."}`);
    await loadReports();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Incident review queue</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Manager responses for submitted incidents</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Review submitted incidents, add manager response notes, set the review status, and save the response back to the worker-visible incident record.</p>
        </div>
        <StatusBadge label={`${queuedReports.length} submitted`} tone={queuedReports.length ? "amber" : "green"} />
      </div>

      {message ? <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <label className="mt-5 grid max-w-md gap-2 text-sm font-semibold text-slate-700">
        Review incidents for
        <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
          <option value="all">All clients</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>

      <label className="mt-4 grid max-w-md gap-2 text-sm font-semibold text-slate-700">
        Review house/service
        <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={selectedHouseId} onChange={(event) => setSelectedHouseId(event.target.value)}>
          <option value="all">All houses/services</option>
          {houses.map((house) => <option key={house.id} value={house.id}>{house.name} - {house.serviceType}</option>)}
        </select>
      </label>

      <div className="mt-5 grid gap-4">
        {!queuedReports.length ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="font-semibold text-ink">No submitted incidents awaiting response</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">When a worker submits an incident, it will appear here for manager review.</p>
          </div>
        ) : null}

        {queuedReports.map((report) => {
          const client = clients.find((item) => item.id === report.participantId);
          const colour = getClientColourScheme(report.participantId, client?.colourSchemeId);
          const reportKey = getReportKey(report);
          const escalationPriority = report.escalationPriority || getSuggestedPriority(report);
          return (
          <div key={reportKey} className={`rounded-md border border-l-4 bg-slate-50 p-4 ${colour.border}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{report.incidentId}</p>
                <h3 className="mt-1 text-xl font-bold text-ink">{report.participant}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{report.date} at {report.time} - {report.location}</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">House/service: {report.houseName || "Unassigned house/service"}</p>
                <span className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${colour.badge}`}>{colour.label} client file</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={escalationPriority} tone={escalationPriority === "Critical" ? "red" : escalationPriority === "Urgent" ? "amber" : "blue"} />
                <StatusBadge label={report.status} tone={report.status === "Locked" ? "green" : report.status === "Needs Review" ? "amber" : "blue"} />
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-md bg-white p-3">
                <p className="text-sm font-semibold text-ink">Worker incident details</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.whatHappened || "No incident detail recorded."}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600"><span className="font-semibold">Immediate response:</span> {report.immediateAction || "Not recorded"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600"><span className="font-semibold">Follow-up requested:</span> {report.followUp || "Not recorded"}</p>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Escalation priority
                    <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={escalationPriority} onChange={(event) => updateReport(reportKey, { escalationPriority: event.target.value as IncidentEscalationPriority })}>
                      {escalationPriorities.map((priority) => <option key={priority}>{priority}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Action due
                    <input type="date" className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={report.escalationDueDate || ""} onChange={(event) => updateReport(reportKey, { escalationDueDate: event.target.value })} />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Assigned manager
                  <input className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={report.escalationAssignedTo || ""} onChange={(event) => updateReport(reportKey, { escalationAssignedTo: event.target.value })} placeholder="Manager responsible for follow-up" />
                </label>
                <fieldset className="rounded-md border border-slate-200 bg-white p-3">
                  <legend className="px-1 text-sm font-semibold text-slate-700">Required actions</legend>
                  <div className="mt-2 grid gap-2">
                    {escalationActionOptions.map((action) => <label key={action} className="flex min-h-10 items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={(report.escalationActions || []).includes(action)} onChange={() => toggleEscalationAction(reportKey, report, action)} />{action}</label>)}
                  </div>
                </fieldset>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Review status
                  <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={report.status} onChange={(event) => updateReport(reportKey, { status: event.target.value as IncidentStatus })}>
                    {reviewStatuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Manager response
                  <textarea
                    className="min-h-36 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-ink"
                    value={report.managerReview}
                    onChange={(event) => updateReport(reportKey, { managerReview: event.target.value })}
                    placeholder="Add manager review, escalation decision, notifications required, risk controls, and closure instructions."
                  />
                </label>
                <button type="button" onClick={() => saveManagerResponse(report)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift">
                  <Save size={17} aria-hidden="true" />
                  Save manager response
                </button>
              </div>
            </div>
          </div>
        );})}
      </div>

      <IncidentBaselineChart reports={reports} clients={clients} houses={houses} />

      <div className="mt-5 flex items-start gap-3 rounded-md border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        Manager responses remain visible to workers on the incident page after saving.
      </div>
    </Card>
  );
}
