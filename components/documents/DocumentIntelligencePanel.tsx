"use client";

import { useEffect, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantDocumentRecords, type StoredDocumentRecord } from "@/lib/document-records";
import { getDocumentIntelligenceDemo } from "@/lib/document-intelligence";

export function DocumentIntelligencePanel() {
  const [documents, setDocuments] = useState<StoredDocumentRecord[]>([]);
  const intelligence = getDocumentIntelligenceDemo();
  const latestDocument = documents[0];

  useEffect(() => {
    function loadDocuments() {
      getTenantDocumentRecords().then(setDocuments).catch(() => setDocuments([]));
    }

    loadDocuments();
    window.addEventListener("empowernotes:documents-updated", loadDocuments);
    return () => window.removeEventListener("empowernotes:documents-updated", loadDocuments);
  }, []);

  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">AI Evidence Reader</h2>
      <p className="mt-2 text-slate-700">
        {latestDocument
          ? `${latestDocument.type} for ${latestDocument.clientName} is ready for extraction review. ${intelligence.summary}`
          : intelligence.summary}
      </p>
      {latestDocument ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          Latest document: <strong>{latestDocument.type}</strong> for <strong>{latestDocument.clientName}</strong>. Status: {latestDocument.status}.
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-600">Extracted goals</p>
          <div className="mt-2 flex flex-wrap gap-2">{intelligence.goals.map((goal) => <StatusBadge key={goal} label={goal} tone="blue" />)}</div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-600">Risk-aware prompts</p>
          <div className="mt-2 flex flex-wrap gap-2">{intelligence.risks.map((risk) => <StatusBadge key={risk} label={risk} tone="amber" />)}</div>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600">Confidence score: {intelligence.confidenceScore}%. Manager verification is required before extracted information becomes authoritative.</p>
    </Card>
  );
}
