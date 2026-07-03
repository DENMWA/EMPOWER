"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { withOrganisationReportHeader } from "@/lib/organisation-profile";
import { participants, progressNotes } from "@/lib/sample-data";

type RetainedRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  savedAt: string;
};

function getRetainedProgressNotes() {
  if (typeof window === "undefined") return [];

  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith("empower-retained-record:"))
    .map((key) => {
      try {
        return JSON.parse(window.localStorage.getItem(key) || "") as RetainedRecord;
      } catch {
        return null;
      }
    })
    .filter((record): record is RetainedRecord => Boolean(record && record.type === "progress-note"));
}

export function ProgressNoteCollectionExport() {
  const [fromDate, setFromDate] = useState("2026-06-01");
  const [toDate, setToDate] = useState("2026-06-30");
  const [includeSavedDrafts, setIncludeSavedDrafts] = useState(true);

  const sampleNotesInRange = useMemo(() => {
    return progressNotes.filter((note) => note.supportDate >= fromDate && note.supportDate <= toDate);
  }, [fromDate, toDate]);

  function downloadCollection() {
    const retained = includeSavedDrafts
      ? getRetainedProgressNotes().filter((record) => {
          const savedDate = record.savedAt.slice(0, 10);
          return savedDate >= fromDate && savedDate <= toDate;
        })
      : [];
    const sampleContent = sampleNotesInRange.map((note) => {
      const participant = participants.find((item) => item.id === note.participantId);
      return [
        `Date: ${note.supportDate}`,
        `Client: ${participant?.name ?? note.participantId}`,
        `Support type: ${note.supportType}`,
        `Status: ${note.status}`,
        "",
        note.finalNote
      ].join("\n");
    });

    const retainedContent = retained.map((record) => {
      const savedDate = record.savedAt.slice(0, 10);
      return [
        `Saved: ${savedDate}`,
        `Title: ${record.title}`,
        "",
        record.body
      ].join("\n");
    });

    const content = withOrganisationReportHeader("EmpowerNotes Progress Note Collection", [
      `Period: ${fromDate} to ${toDate}`,
      `Exported: ${new Date().toLocaleString("en-AU")}`,
      "",
      [...sampleContent, ...retainedContent].join("\n\n---\n\n") || "No progress notes found for this period."
    ].join("\n"));

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `empowernotes-progress-notes-${fromDate}-to-${toDate}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="border-sky-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Collection export</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Download progress notes by period</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Progress notes are exported as a date-range collection for audit packs, plan reviews, billing evidence, and manager review.
          </p>
        </div>
        <StatusBadge label={`${sampleNotesInRange.length} sample notes`} tone="blue" />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          From
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          To
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3" />
        </label>
        <button type="button" onClick={downloadCollection} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift">
          <Download size={17} aria-hidden="true" />
          Download collection
        </button>
      </div>
      <label className="mt-4 flex items-start gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={includeSavedDrafts} onChange={(event) => setIncludeSavedDrafts(event.target.checked)} />
        Include locally saved progress-note drafts from this browser.
      </label>
    </Card>
  );
}
