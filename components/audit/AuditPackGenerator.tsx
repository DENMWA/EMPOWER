"use client";

import { useEffect, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { generateAuditPack } from "@/lib/ai-mock";
import { downloadOrganisationReportHtml } from "@/lib/organisation-profile";
import { getTenantDocumentRecords } from "@/lib/document-records";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";

export function AuditPackGenerator() {
  const pack = generateAuditPack();
  const [progressNotes, setProgressNotes] = useState<RetainedRecord[]>([]);
  const [incidentReports, setIncidentReports] = useState<RetainedRecord[]>([]);
  const [documentsCount, setDocumentsCount] = useState(0);

  useEffect(() => {
    function loadRecords() {
      getTenantRetainedRecords("progress-note").then(setProgressNotes).catch(() => setProgressNotes([]));
      getTenantRetainedRecords("incident-report").then(setIncidentReports).catch(() => setIncidentReports([]));
      getTenantDocumentRecords().then((records) => setDocumentsCount(records.length)).catch(() => setDocumentsCount(0));
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
      `Client: ${pack.participant}`,
      `Generated: ${new Date().toLocaleString("en-AU")}`,
      `Saved progress notes: ${progressNotes.length}`,
      `Saved incident reports: ${incidentReports.length}`,
      `Saved documents: ${documentsCount}`,
      "",
      "Sections:",
      ...pack.sections.map((section) => `- ${section}`),
      "",
      "Saved progress note titles:",
      ...(progressNotes.length ? progressNotes.map((record) => `- ${record.title}`) : ["- None saved yet"]),
      "",
      "Saved incident report titles:",
      ...(incidentReports.length ? incidentReports.map((record) => `- ${record.title}`) : ["- None saved yet"])
    ].join("\n");
    downloadOrganisationReportHtml("empowernotes-audit-pack.html", "EmpowerNotes Audit Pack", content);
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Audit Pack Generator</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">Participant/client<input className="mt-2 w-full rounded-md border border-slate-300 p-3" defaultValue={pack.participant} /></label>
        <label className="text-sm font-semibold text-slate-700">Start date<input className="mt-2 w-full rounded-md border border-slate-300 p-3" type="date" defaultValue="2026-06-01" /></label>
        <label className="text-sm font-semibold text-slate-700">End date<input className="mt-2 w-full rounded-md border border-slate-300 p-3" type="date" defaultValue="2026-06-30" /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{pack.sections.map((section) => <StatusBadge key={section} label={section} tone="blue" />)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Saved notes" value={progressNotes.length} />
        <MiniMetric label="Saved incidents" value={incidentReports.length} />
        <MiniMetric label="Documents" value={documentsCount} />
      </div>
      <button type="button" onClick={downloadAuditPack} className="mt-4 rounded-md bg-sea px-4 py-3 text-sm font-semibold text-white">Generate branded audit pack</button>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
