"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getSavedIncidentReports, type StoredIncidentReport } from "@/lib/incident-records";

export function IncidentManagerResponses() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [reports, setReports] = useState<StoredIncidentReport[]>([]);
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

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-sky-50 text-sky-800">
            <MessageSquareText size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Manager responses</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Submitted incident feedback</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">After admin reviews a submitted incident, the manager response appears here for staff visibility.</p>
          </div>
        </div>
        <StatusBadge label={`${filteredReports.length} submitted incidents`} tone="blue" />
      </div>

      <label className="mt-5 grid max-w-md gap-2 text-sm font-semibold text-slate-700">
        View responses for
        <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
          <option value="all">All clients</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>

      <div className="mt-5 grid gap-3">
        {!filteredReports.length ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="font-semibold text-ink">No submitted incidents yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Submit an incident report and it will appear here once saved for admin review.</p>
          </div>
        ) : null}

        {filteredReports.map((report) => {
          const client = clients.find((item) => item.id === report.participantId);
          const colour = getClientColourScheme(report.participantId, client?.colourSchemeId);
          return (
          <div key={`${report.participantId}-${report.incidentId}`} className={`rounded-md border border-l-4 bg-slate-50 p-4 ${colour.border}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-ink">{report.incidentId} - {report.participant}</p>
                <p className="mt-1 text-sm text-slate-600">{report.date} at {report.time} - {report.incidentTypes.join(", ") || "Incident"}</p>
                <span className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${colour.badge}`}>{colour.label} client file</span>
              </div>
              <StatusBadge label={report.status} tone={report.status === "Locked" ? "green" : report.status === "Needs Review" ? "amber" : "blue"} />
            </div>
            <div className="mt-3 rounded-md bg-white p-3">
              <p className="text-sm font-semibold text-ink">Manager response</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.managerReview || "Awaiting manager response."}</p>
            </div>
          </div>
        );})}
      </div>
    </Card>
  );
}
