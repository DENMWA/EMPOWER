"use client";

import { useEffect, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantDocumentRecords } from "@/lib/document-records";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";

export function SavedRecordsSummary() {
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

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Saved testing records</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Live records available to admin reports</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use this to confirm notes, incidents, and documents are being retained during testing.</p>
        </div>
        <StatusBadge label="Live testing data" tone="green" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Progress notes" value={progressNotes.length} />
        <Metric label="Incident reports" value={incidentReports.length} />
        <Metric label="Documents" value={documentsCount} />
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}
