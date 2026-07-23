"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileCheck2 } from "lucide-react";
import { AdminGate } from "@/components/admin/AdminGate";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import { isDemoModeEnabled } from "@/lib/presentation-mode";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";
import { participants, progressNotes, users } from "@/lib/sample-data";

export default function AdminReviewsPage() {
  const [savedNotes, setSavedNotes] = useState<RetainedRecord[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const savedReviewQueue = useMemo(() => savedNotes.map(toSavedReviewItem), [savedNotes]);
  const sampleReviewQueue = useMemo(() => {
    return demoMode
      ? progressNotes
        .filter((note) => note.status !== "Approved" || note.missingDetails.length > 0 || note.riskyWordingFlags.length > 0)
        .map((note) => {
          const participant = participants.find((item) => item.id === note.participantId);
          const worker = users.find((item) => item.id === note.staffId);
          return {
            id: note.id,
            eyebrow: `${worker?.name ?? "Worker"} - ${note.supportDate}`,
            title: `${participant?.name ?? "Client"} - ${note.supportType}`,
            detail: `Audit score ${note.score}% - Billing evidence ${note.billingEvidenceScore}%`,
            status: note.status,
            missingDetails: note.missingDetails,
            riskyWordingFlags: note.riskyWordingFlags,
            body: note.finalNote
          };
        })
      : [];
  }, [demoMode]);
  const reviewQueue = savedReviewQueue.length ? savedReviewQueue : sampleReviewQueue;

  useEffect(() => {
    function loadNotes() {
      getTenantRetainedRecords("progress-note").then(setSavedNotes).catch(() => setSavedNotes([]));
    }

    loadNotes();
    window.addEventListener("empowernotes:retained-records-updated", loadNotes);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadNotes);
  }, []);

  useEffect(() => {
    function syncMode() {
      setDemoMode(isDemoModeEnabled());
    }

    syncMode();
    window.addEventListener("empowernotes:data-mode-updated", syncMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncMode);
  }, []);

  return (
    <AdminGate>
      <PageHeader
        eyebrow="Admin note review"
        title="Review note quality before it becomes evidence"
        description="A locked admin queue for weak notes, missing details, risky wording, and approval follow-up."
        actions={<StatusBadge label={`${reviewQueue.length} items`} tone="amber" />}
      />
      <Section className="space-y-4">
        {reviewQueue.map((note) => {
          return (
            <Card key={note.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{note.eyebrow}</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">{note.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{note.detail}</p>
                </div>
                <StatusBadge label={note.status} tone={note.status === "Approved" ? "green" : "amber"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {note.missingDetails.map((item) => <StatusBadge key={item} label={`Missing: ${item}`} tone="amber" />)}
                {note.riskyWordingFlags.map((item) => <StatusBadge key={item} label={`Risky wording: ${item}`} tone="red" />)}
              </div>
              <p className="mt-4 max-h-32 overflow-auto rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">{note.body}</p>
            </Card>
          );
        })}
        {!reviewQueue.length ? (
          <Card>
            <p className="font-semibold text-ink">No progress notes waiting for review</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Saved progress notes will appear here for admin quality review. In demo mode, sample review notes are shown.</p>
          </Card>
        ) : null}
        <Link href="/notes/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
          <FileCheck2 size={18} aria-hidden="true" />Open note workspace
        </Link>
      </Section>
    </AdminGate>
  );
}

function toSavedReviewItem(record: RetainedRecord) {
  const missingDetails = getMissingDetails(record.body);
  const riskyWordingFlags = getRiskyWording(record.body);
  const score = Math.max(45, 92 - missingDetails.length * 8 - riskyWordingFlags.length * 10);
  const client = extractField(record.body, "Client") || "Client";
  const supportType = extractField(record.body, "Support type") || "Progress note";
  const date = extractField(record.body, "Date") || new Date(record.savedAt).toLocaleDateString("en-AU");

  return {
    id: record.id,
    eyebrow: `Saved ${new Date(record.savedAt).toLocaleString("en-AU")} - ${date}`,
    title: `${client} - ${supportType}`,
    detail: `Estimated audit score ${score}% - ${missingDetails.length + riskyWordingFlags.length} review signal${missingDetails.length + riskyWordingFlags.length === 1 ? "" : "s"}`,
    status: missingDetails.length || riskyWordingFlags.length ? "Needs Review" : "Submitted",
    missingDetails,
    riskyWordingFlags,
    body: record.body
  };
}

function extractField(body: string, field: string) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}

function getMissingDetails(body: string) {
  const fields = [
    ["Client", extractField(body, "Client")],
    ["House/service", extractField(body, "House/service")],
    ["Support type", extractField(body, "Support type")],
    ["Date", extractField(body, "Date")],
    ["Time", extractField(body, "Time")],
    ["Goal link", body.toLowerCase().includes("goal") ? "present" : ""],
    ["Follow-up action", body.toLowerCase().includes("follow-up") ? "present" : ""]
  ];

  return fields.filter(([, value]) => !value || value.toLowerCase().includes("not selected")).map(([label]) => label);
}

function getRiskyWording(body: string) {
  const riskyTerms = ["aggressive", "non-compliant", "refused to listen", "attention-seeking", "bad behaviour", "lazy", "naughty"];
  const lower = body.toLowerCase();
  return riskyTerms.filter((term) => lower.includes(term));
}
