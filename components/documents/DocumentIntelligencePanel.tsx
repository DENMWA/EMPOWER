"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantDocumentRecords, type StoredDocumentRecord } from "@/lib/document-records";

const dayMs = 24 * 60 * 60 * 1000;

export function DocumentIntelligencePanel() {
  const [documents, setDocuments] = useState<StoredDocumentRecord[]>([]);
  const intelligence = useMemo(() => buildDocumentIntelligence(documents), [documents]);
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Document intelligence</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">AI Evidence Reader</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{intelligence.summary}</p>
        </div>
        <StatusBadge label={`${intelligence.confidenceScore}% review confidence`} tone={intelligence.confidenceScore >= 80 ? "green" : documents.length ? "amber" : "blue"} />
      </div>

      {latestDocument ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          Latest document: <strong>{latestDocument.type}</strong> for <strong>{latestDocument.clientName}</strong>. Status: {latestDocument.status}.
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-600">Evidence coverage</p>
          <div className="mt-2 flex flex-wrap gap-2">{intelligence.coverage.map((item) => <StatusBadge key={item} label={item} tone="blue" />)}</div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-600">Risk-aware prompts</p>
          <div className="mt-2 flex flex-wrap gap-2">{intelligence.risks.map((risk) => <StatusBadge key={risk} label={risk} tone="amber" />)}</div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        Manager verification is required before document intelligence is treated as authoritative support evidence.
      </p>
    </Card>
  );
}

function buildDocumentIntelligence(documents: StoredDocumentRecord[]) {
  if (!documents.length) {
    return {
      summary: "Upload client documents to generate evidence coverage, expiry prompts, and manager verification checks.",
      coverage: ["No documents uploaded"],
      risks: ["Waiting for client-specific records"],
      confidenceScore: 0
    };
  }

  const clientNames = new Set(documents.map((document) => document.clientName || "Unassigned client"));
  const documentTypes = Array.from(new Set(documents.map((document) => document.type))).slice(0, 4);
  const managerVerifiedCount = documents.filter((document) => document.status.toLowerCase().includes("verified")).length;
  const expiringSoonCount = documents.filter((document) => getDaysUntilExpiry(document.expiryDate) <= 30).length;
  const managerOnlyCount = documents.filter((document) => document.visibility === "manager-only").length;
  const confidenceScore = Math.min(96, Math.round(((managerVerifiedCount / documents.length) * 70) + (documentTypes.length >= 3 ? 20 : 10) + (expiringSoonCount ? 0 : 10)));

  const risks = [
    expiringSoonCount > 0 && `${expiringSoonCount} document${expiringSoonCount === 1 ? "" : "s"} expiring within 30 days`,
    managerVerifiedCount < documents.length && `${documents.length - managerVerifiedCount} document${documents.length - managerVerifiedCount === 1 ? "" : "s"} awaiting verification`,
    documents.some((document) => document.clientName === "Client" || document.clientName === "Unassigned client") && "Some documents need confirmed client assignment"
  ].filter(Boolean) as string[];

  return {
    summary: `${documents.length} document${documents.length === 1 ? "" : "s"} across ${clientNames.size} client${clientNames.size === 1 ? "" : "s"} are available for review. EmpowerNotes is checking evidence coverage, expiry timing, and manager verification status.`,
    coverage: [
      `${clientNames.size} client file${clientNames.size === 1 ? "" : "s"}`,
      `${managerVerifiedCount} manager verified`,
      `${managerOnlyCount} manager-only record${managerOnlyCount === 1 ? "" : "s"}`,
      ...documentTypes
    ],
    risks: risks.length ? risks : ["No immediate document risks identified"],
    confidenceScore
  };
}

function getDaysUntilExpiry(expiryDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  return Math.ceil((expiry.getTime() - today.getTime()) / dayMs);
}
