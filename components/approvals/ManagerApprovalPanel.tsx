"use client";

import { useEffect, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { downloadOrganisationReportHtml } from "@/lib/organisation-profile";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";
import { progressNotes, users } from "@/lib/sample-data";

export function ManagerApprovalPanel() {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [savedNotes, setSavedNotes] = useState<RetainedRecord[]>([]);

  useEffect(() => {
    function loadNotes() {
      getTenantRetainedRecords("progress-note").then(setSavedNotes).catch(() => setSavedNotes([]));
    }

    loadNotes();
    window.addEventListener("empowernotes:retained-records-updated", loadNotes);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadNotes);
  }, []);

  function updateStatus(noteId: string, status: string) {
    setStatuses((current) => ({ ...current, [noteId]: status }));
  }

  function exportNote(noteId: string, title: string, body: string) {
    downloadOrganisationReportHtml(`empowernotes-${noteId}-approval-record.html`, title, `${body}\n\nExported: ${new Date().toLocaleString("en-AU")}`);
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Manager Approval Workflow</h2>
      <div className="mt-4 space-y-4">
        {savedNotes.map((record) => {
          const status = statuses[record.id] ?? "Needs Review";
          return (
            <div key={record.id} className="rounded-md border border-teal-100 bg-teal-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{record.title}</p>
                  <p className="text-sm text-slate-600">Saved {new Date(record.savedAt).toLocaleString("en-AU")} - retained note ready for manager action</p>
                </div>
                <StatusBadge label={status} tone={status === "Approved" || status === "Locked" ? "green" : "amber"} />
              </div>
              <p className="mt-3 max-h-28 overflow-auto rounded-md bg-white p-3 text-sm leading-6 text-slate-700">{record.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => updateStatus(record.id, "Approved")} className="rounded-md bg-sea px-3 py-2 text-sm font-semibold text-white">Approve</button>
                <button type="button" onClick={() => updateStatus(record.id, "Needs Review")} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Send back</button>
                <button type="button" onClick={() => updateStatus(record.id, "Locked")} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Lock final note</button>
                <button type="button" onClick={() => exportNote(record.id, `${record.title} approval record`, record.body)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Export report</button>
              </div>
            </div>
          );
        })}
        {progressNotes.map((note) => {
          const staff = users.find((user) => user.id === note.staffId);
          const status = statuses[note.id] ?? note.status;
          return (
            <div key={note.id} className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{note.supportType}</p>
                  <p className="text-sm text-slate-600">Submitted by {staff?.name} - original note and transcript preserved</p>
                </div>
                <StatusBadge label={status} tone={status === "Approved" || status === "Locked" ? "green" : "amber"} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => updateStatus(note.id, "Approved")} className="rounded-md bg-sea px-3 py-2 text-sm font-semibold text-white">Approve</button>
                <button type="button" onClick={() => updateStatus(note.id, "Needs Review")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Send back</button>
                <button type="button" onClick={() => updateStatus(note.id, "Locked")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Lock final note</button>
                <button type="button" onClick={() => exportNote(note.id, `${note.supportType} approval record`, note.finalNote)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Export report</button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
