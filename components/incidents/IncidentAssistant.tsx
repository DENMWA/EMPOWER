"use client";

import { useState } from "react";
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
        </div>
      </div>
    </Card>
  );
}
