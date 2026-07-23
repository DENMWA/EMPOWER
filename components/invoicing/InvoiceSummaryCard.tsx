"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getSavedIncidentReports, type StoredIncidentReport } from "@/lib/incident-records";
import { downloadOrganisationReportHtml } from "@/lib/organisation-profile";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";

export function InvoiceSummaryCard() {
  const currentMonthRange = getCurrentMonthDateRange();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [progressNotes, setProgressNotes] = useState<RetainedRecord[]>([]);
  const [incidents, setIncidents] = useState<StoredIncidentReport[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [fromDate, setFromDate] = useState(currentMonthRange.fromDate);
  const [toDate, setToDate] = useState(currentMonthRange.toDate);
  const [message, setMessage] = useState("");
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const invoiceSummary = useMemo(() => buildInvoiceSummary({
    client: selectedClient,
    fromDate,
    toDate,
    notes: progressNotes,
    incidents
  }), [fromDate, incidents, progressNotes, selectedClient, toDate]);

  useEffect(() => {
    function loadRecords() {
      getTenantClients().then(setClients).catch(() => setClients([]));
      getTenantRetainedRecords("progress-note").then(setProgressNotes).catch(() => setProgressNotes([]));
      getSavedIncidentReports().then((items) => setIncidents(items.map((item) => item.report))).catch(() => setIncidents([]));
    }

    loadRecords();
    window.addEventListener("empowernotes:retained-records-updated", loadRecords);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadRecords);
  }, []);

  function downloadSummary() {
    const lines = Object.entries(invoiceSummary).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`);
    downloadOrganisationReportHtml("empowernotes-invoice-summary.html", "EmpowerNotes Invoice Summary", lines.join("\n"));
    setMessage("Invoice summary downloaded.");
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Invoice evidence</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Invoice Summary</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Review saved progress notes and unresolved incidents before treating support records as invoice evidence.</p>
        </div>
        <StatusBadge label={invoiceSummary.status} tone={invoiceSummary.status === "Ready for review" ? "green" : "amber"} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Client
          <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
            <option value="all">All clients</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          From
          <input className="min-h-11 rounded-md border border-slate-300 bg-white px-3" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          To
          <input className="min-h-11 rounded-md border border-slate-300 bg-white px-3" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {Object.entries(invoiceSummary).map(([key, value]) => (
          <div key={key} className="rounded-md bg-slate-50 p-3">
            <dt className="font-semibold capitalize text-slate-600">{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd className="mt-1 text-ink">{Array.isArray(value) ? value.join(", ") : value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={downloadSummary} className="rounded-md bg-sea px-4 py-3 text-sm font-semibold text-white">Download invoice summary</button>
        <button type="button" onClick={() => setMessage("Invoice marked ready for admin review. Connect accounting software before live sending.")} className="rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold">Mark ready for review</button>
      </div>
      {message ? <p className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">{message}</p> : null}
      <div className="mt-3"><StatusBadge label="No accounting engine connected" tone="blue" /></div>
    </Card>
  );
}

function buildInvoiceSummary(input: {
  client: ClientRecord | undefined;
  fromDate: string;
  toDate: string;
  notes: RetainedRecord[];
  incidents: StoredIncidentReport[];
}) {
  const notes = input.notes.filter((record) => isProgressNoteInRange(record, input.client, input.fromDate, input.toDate));
  const incidents = input.incidents.filter((incident) => {
    const clientMatch = !input.client || incident.participantId === input.client.id || incident.participant === input.client.name;
    return clientMatch && incident.date >= input.fromDate && incident.date <= input.toDate && incident.status !== "Locked";
  });
  const notesWithGoal = notes.filter((record) => record.body.toLowerCase().includes("goal")).length;
  const notesWithFollowUp = notes.filter((record) => record.body.toLowerCase().includes("follow-up")).length;
  const evidenceScore = notes.length
    ? Math.max(45, Math.round(((notesWithGoal + notesWithFollowUp) / (notes.length * 2)) * 100) - incidents.length * 8)
    : 0;
  const missingEvidenceItems = [
    !notes.length && "No saved progress notes in selected period",
    notes.length > notesWithGoal && "Some notes need a goal or service-purpose link",
    notes.length > notesWithFollowUp && "Some notes need follow-up or outcome detail",
    incidents.length > 0 && "Unresolved incident reports need manager review before invoicing"
  ].filter(Boolean) as string[];

  return {
    participant: input.client?.name || "All clients",
    dateRange: `${input.fromDate} to ${input.toDate}`,
    linkedNotes: notes.length,
    unresolvedIncidentFlags: incidents.length ? incidents.map((incident) => `${incident.incidentId} - ${incident.participant}`) : ["None"],
    evidenceScore: `${evidenceScore}%`,
    missingEvidenceItems: missingEvidenceItems.length ? missingEvidenceItems : ["None identified"],
    status: missingEvidenceItems.length ? "Needs evidence" : "Ready for review"
  };
}

function isProgressNoteInRange(record: RetainedRecord, client: ClientRecord | undefined, fromDate: string, toDate: string) {
  const supportDate = extractField(record.body, "Date") || record.savedAt.slice(0, 10);
  const clientName = extractField(record.body, "Client");
  const clientMatch = !client || clientName === client.name || record.id.includes(client.id);
  return clientMatch && supportDate >= fromDate && supportDate <= toDate;
}

function extractField(body: string, field: string) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}

function getCurrentMonthDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    fromDate: toDateInputValue(start),
    toDate: toDateInputValue(end)
  };
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
