"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getSavedIncidentReports, saveIncidentReport, type IncidentStatus, type StoredIncidentReport } from "@/lib/incident-records";

const reviewStatuses: IncidentStatus[] = ["Submitted", "Needs Review", "Locked"];

export function IncidentReviewQueue() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [reports, setReports] = useState<StoredIncidentReport[]>([]);
  const [message, setMessage] = useState("");
  const filteredReports = useMemo(() => {
    return selectedClientId === "all" ? reports : reports.filter((report) => report.participantId === selectedClientId);
  }, [reports, selectedClientId]);

  useEffect(() => {
    getTenantClients().then(setClients).catch(() => setClients([]));
    loadReports();
    window.addEventListener("empowernotes:retained-records-updated", loadReports);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadReports);
  }, []);

  async function loadReports() {
    const saved = await getSavedIncidentReports().catch(() => []);
    setReports(saved.map((item) => item.report).filter((report) => report.status !== "Draft"));
  }

  function getReportKey(report: StoredIncidentReport) {
    return `${report.participantId}-${report.incidentId}`;
  }

  function updateReport(reportKey: string, patch: Partial<StoredIncidentReport>) {
    setReports((current) => current.map((report) => getReportKey(report) === reportKey ? { ...report, ...patch } : report));
  }

  async function saveManagerResponse(report: StoredIncidentReport) {
    const nextReport = {
      ...report,
      status: report.status === "Submitted" ? "Needs Review" as const : report.status
    };
    const result = await saveIncidentReport(nextReport);
    setMessage(result.savedToCloud ? `${report.incidentId} manager response saved.` : `${report.incidentId} manager response saved locally. Sign in to save it to Supabase.`);
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
        <StatusBadge label={`${filteredReports.length} submitted`} tone={filteredReports.length ? "amber" : "green"} />
      </div>

      {message ? <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <label className="mt-5 grid max-w-md gap-2 text-sm font-semibold text-slate-700">
        Review incidents for
        <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
          <option value="all">All clients</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>

      <div className="mt-5 grid gap-4">
        {!filteredReports.length ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="font-semibold text-ink">No submitted incidents awaiting response</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">When a worker submits an incident, it will appear here for manager review.</p>
          </div>
        ) : null}

        {filteredReports.map((report) => {
          const client = clients.find((item) => item.id === report.participantId);
          const colour = getClientColourScheme(report.participantId, client?.colourSchemeId);
          const reportKey = getReportKey(report);
          return (
          <div key={reportKey} className={`rounded-md border border-l-4 bg-slate-50 p-4 ${colour.border}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{report.incidentId}</p>
                <h3 className="mt-1 text-xl font-bold text-ink">{report.participant}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{report.date} at {report.time} - {report.location}</p>
                <span className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${colour.badge}`}>{colour.label} client file</span>
              </div>
              <StatusBadge label={report.status} tone={report.status === "Locked" ? "green" : report.status === "Needs Review" ? "amber" : "blue"} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-md bg-white p-3">
                <p className="text-sm font-semibold text-ink">Worker incident details</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.whatHappened || "No incident detail recorded."}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600"><span className="font-semibold">Immediate response:</span> {report.immediateAction || "Not recorded"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600"><span className="font-semibold">Follow-up requested:</span> {report.followUp || "Not recorded"}</p>
              </div>

              <div className="grid gap-3">
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

      <div className="mt-5 flex items-start gap-3 rounded-md border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        Manager responses remain visible to workers on the incident page after saving.
      </div>
    </Card>
  );
}
