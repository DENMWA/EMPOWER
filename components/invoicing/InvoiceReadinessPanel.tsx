"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { getSavedIncidentReports, type StoredIncidentReport } from "@/lib/incident-records";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";

type ReadinessStatus = "Ready" | "Needs Evidence" | "Waiting for Records";

export function InvoiceReadinessPanel() {
  const [progressNotes, setProgressNotes] = useState<RetainedRecord[]>([]);
  const [incidents, setIncidents] = useState<StoredIncidentReport[]>([]);
  const readiness = useMemo(() => getLiveInvoiceReadiness(progressNotes, incidents), [incidents, progressNotes]);

  useEffect(() => {
    function loadRecords() {
      getTenantRetainedRecords("progress-note").then(setProgressNotes).catch(() => setProgressNotes([]));
      getSavedIncidentReports().then((items) => setIncidents(items.map((item) => item.report))).catch(() => setIncidents([]));
    }

    loadRecords();
    window.addEventListener("empowernotes:retained-records-updated", loadRecords);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadRecords);
  }, []);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Billing evidence</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Evidence-based Invoice Readiness</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Live check from saved progress notes and incident reports before records are used for billing.
          </p>
        </div>
        <StatusBadge label={readiness.status} tone={readiness.status === "Ready" ? "green" : readiness.status === "Waiting for Records" ? "blue" : "amber"} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ReadinessMetric label="Evidence score" value={`${readiness.evidenceScore}%`} />
        <ReadinessMetric label="Saved notes checked" value={String(progressNotes.length)} />
        <ReadinessMetric label="Open incident flags" value={String(readiness.openIncidentCount)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {readiness.missing.map((item) => <StatusBadge key={item} label={item} tone={readiness.status === "Ready" ? "green" : "amber"} />)}
      </div>
    </Card>
  );
}

function ReadinessMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function getLiveInvoiceReadiness(notes: RetainedRecord[], incidents: StoredIncidentReport[]) {
  const openIncidents = incidents.filter((incident) => incident.status !== "Locked");

  if (!notes.length) {
    return {
      status: "Waiting for Records" as ReadinessStatus,
      missing: ["Save progress notes to assess billing evidence"],
      evidenceScore: 0,
      openIncidentCount: openIncidents.length
    };
  }

  const noteSignals = notes.map((note) => getProgressNoteEvidenceSignals(note.body));
  const readyNotes = noteSignals.filter((signals) => signals.hasGoalLink && signals.hasFollowUp && signals.hasSupportDetail && !signals.hasRiskyWording);
  const baseScore = Math.round((readyNotes.length / notes.length) * 100);
  const incidentPenalty = Math.min(openIncidents.length * 8, 32);
  const evidenceScore = Math.max(0, Math.min(100, baseScore - incidentPenalty));
  const missing = [
    noteSignals.some((signals) => !signals.hasSupportDetail) && "Add clearer support actions and participant response",
    noteSignals.some((signals) => !signals.hasGoalLink) && "Add goal or service-purpose link",
    noteSignals.some((signals) => !signals.hasFollowUp) && "Add outcome or follow-up detail",
    noteSignals.some((signals) => signals.hasRiskyWording) && "Review subjective or risky wording",
    openIncidents.length > 0 && "Resolve open incident flags before invoice evidence use",
    evidenceScore < 75 && "Improve evidence score before billing review"
  ].filter(Boolean) as string[];

  return {
    status: missing.length ? "Needs Evidence" as ReadinessStatus : "Ready" as ReadinessStatus,
    missing: missing.length ? missing : ["Ready for admin billing review"],
    evidenceScore,
    openIncidentCount: openIncidents.length
  };
}

function getProgressNoteEvidenceSignals(body: string) {
  const lower = body.toLowerCase();
  return {
    hasGoalLink: /\b(goal|ndis|outcome|support purpose|service purpose)\b/.test(lower),
    hasFollowUp: /\b(follow-up|follow up|outcome|next shift|monitor|review|escalat|manager)\b/.test(lower),
    hasSupportDetail: /\b(supported|prompted|assisted|observed|encouraged|completed|provided|responded)\b/.test(lower) && body.trim().length >= 180,
    hasRiskyWording: /\b(non-compliant|aggressive|manipulative|attention-seeking|lazy|naughty|refused to listen)\b/.test(lower)
  };
}
