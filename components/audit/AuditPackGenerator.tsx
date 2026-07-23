"use client";

import { useEffect, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { generateAuditPack } from "@/lib/ai-mock";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { downloadOrganisationReportHtml } from "@/lib/organisation-profile";
import { getTenantDocumentRecords, type StoredDocumentRecord } from "@/lib/document-records";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";

export function AuditPackGenerator() {
  const pack = generateAuditPack();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [fromDate, setFromDate] = useState("2026-06-01");
  const [toDate, setToDate] = useState("2026-06-30");
  const [progressNotes, setProgressNotes] = useState<RetainedRecord[]>([]);
  const [incidentReports, setIncidentReports] = useState<RetainedRecord[]>([]);
  const [documents, setDocuments] = useState<StoredDocumentRecord[]>([]);
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const filteredProgressNotes = progressNotes.filter((record) => isRecordInAuditRange(record, selectedClient, fromDate, toDate));
  const filteredIncidentReports = incidentReports.filter((record) => isIncidentInAuditRange(record, selectedClient, fromDate, toDate));
  const filteredDocuments = documents.filter((document) => {
    const clientMatch = selectedClientId === "all" || document.participantId === selectedClientId;
    const documentDate = document.savedAt.slice(0, 10);
    return clientMatch && documentDate >= fromDate && documentDate <= toDate;
  });

  useEffect(() => {
    function loadRecords() {
      getTenantClients().then(setClients).catch(() => setClients([]));
      getTenantRetainedRecords("progress-note").then(setProgressNotes).catch(() => setProgressNotes([]));
      getTenantRetainedRecords("incident-report").then(setIncidentReports).catch(() => setIncidentReports([]));
      getTenantDocumentRecords().then(setDocuments).catch(() => setDocuments([]));
    }

    loadRecords();
    window.addEventListener("empowernotes:retained-records-updated", loadRecords);
    window.addEventListener("empowernotes:documents-updated", loadRecords);
    return () => {
      window.removeEventListener("empowernotes:retained-records-updated", loadRecords);
      window.removeEventListener("empowernotes:documents-updated", loadRecords);
    };
  }, []);

  function downloadAuditPack() {
    const content = [
      `Client: ${selectedClient?.name || "All clients"}`,
      `Period: ${fromDate} to ${toDate}`,
      `Generated: ${new Date().toLocaleString("en-AU")}`,
      `Saved progress notes: ${filteredProgressNotes.length}`,
      `Saved incident reports: ${filteredIncidentReports.length}`,
      `Saved documents: ${filteredDocuments.length}`,
      "",
      "Sections:",
      ...pack.sections.map((section) => `- ${section}`),
      "",
      "Saved progress note titles:",
      ...(filteredProgressNotes.length ? filteredProgressNotes.map((record) => `- ${record.title} (${new Date(record.savedAt).toLocaleString("en-AU")})`) : ["- None saved for this client and period"]),
      "",
      "Saved incident report titles:",
      ...(filteredIncidentReports.length ? filteredIncidentReports.map((record) => `- ${record.title} (${new Date(record.savedAt).toLocaleString("en-AU")})`) : ["- None saved for this client and period"]),
      "",
      "Saved document records:",
      ...(filteredDocuments.length ? filteredDocuments.map((document) => `- ${document.type} for ${document.clientName} | ${document.status} | Expiry ${document.expiryDate}`) : ["- None saved for this client and period"])
    ].join("\n");
    downloadOrganisationReportHtml("empowernotes-audit-pack.html", "EmpowerNotes Audit Pack", content);
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Audit Pack Generator</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">
          Participant/client
          <select className="mt-2 w-full rounded-md border border-slate-300 p-3" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
            <option value="all">All clients</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Start date<input className="mt-2 w-full rounded-md border border-slate-300 p-3" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label className="text-sm font-semibold text-slate-700">End date<input className="mt-2 w-full rounded-md border border-slate-300 p-3" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{pack.sections.map((section) => <StatusBadge key={section} label={section} tone="blue" />)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Saved notes" value={filteredProgressNotes.length} />
        <MiniMetric label="Saved incidents" value={filteredIncidentReports.length} />
        <MiniMetric label="Documents" value={filteredDocuments.length} />
      </div>
      <button type="button" onClick={downloadAuditPack} className="mt-4 rounded-md bg-sea px-4 py-3 text-sm font-semibold text-white">Generate branded audit pack</button>
    </Card>
  );
}

function extractField(body: string, field: string) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}

function isRecordInAuditRange(record: RetainedRecord, client: ClientRecord | undefined, fromDate: string, toDate: string) {
  const supportDate = extractField(record.body, "Date") || record.savedAt.slice(0, 10);
  const clientName = extractField(record.body, "Client");
  const clientMatch = !client || clientName === client.name || record.id.includes(client.id);
  return clientMatch && supportDate >= fromDate && supportDate <= toDate;
}

function isIncidentInAuditRange(record: RetainedRecord, client: ClientRecord | undefined, fromDate: string, toDate: string) {
  try {
    const incident = JSON.parse(record.body) as { date?: string; participant?: string; participantId?: string };
    const incidentDate = incident.date || record.savedAt.slice(0, 10);
    const clientMatch = !client || incident.participantId === client.id || incident.participant === client.name;
    return clientMatch && incidentDate >= fromDate && incidentDate <= toDate;
  } catch {
    return isRecordInAuditRange(record, client, fromDate, toDate);
  }
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
