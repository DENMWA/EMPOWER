"use client";

import { useState } from "react";
import { RecordActions } from "@/components/records/RecordActions";
import { Card, StatusBadge } from "@/components/ui";
import { generateIncidentSummary } from "@/lib/ai-mock";
import { sampleIncident } from "@/lib/sample-data";

export function IncidentAssistant() {
  const [details, setDetails] = useState(sampleIncident);
  const summary = generateIncidentSummary();
  return (
    <Card>
      <h2 className="text-2xl font-bold text-ink">Guided Incident Report Assistant</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          What happened?
          <textarea className="mt-2 min-h-44 w-full rounded-md border border-slate-300 p-3" value={details} onChange={(event) => setDetails(event.target.value)} />
        </label>
        <div className="rounded-md bg-slate-50 p-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge label="Manager review required" tone="amber" />
            <StatusBadge label="No final legal decision" tone="blue" />
          </div>
          <p className="mt-4 leading-7 text-slate-800">{summary.summary}</p>
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">{summary.reviewPrompt}</p>
          <RecordActions
            className="mt-4"
            recordId="incident-report-draft"
            recordType="incident-report"
            title="Guided Incident Report"
            body={[details, "", summary.summary, summary.reviewPrompt].join("\n")}
            filename="empower-notes-incident-report"
          />
          <p className="mt-3 text-sm text-slate-600">Demo save keeps the incident report in this browser. Production should retain incident reports with manager review and audit history.</p>
        </div>
      </div>
    </Card>
  );
}
