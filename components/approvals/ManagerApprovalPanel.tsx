"use client";

import { useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { progressNotes, users } from "@/lib/sample-data";

export function ManagerApprovalPanel() {
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  function updateStatus(noteId: string, status: string) {
    setStatuses((current) => ({ ...current, [noteId]: status }));
  }

  function exportNote(noteId: string, title: string, body: string) {
    const blob = new Blob([`${title}\n\n${body}\n\nExported: ${new Date().toLocaleString("en-AU")}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `empowernotes-${noteId}-approval-record.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Manager Approval Workflow</h2>
      <div className="mt-4 space-y-4">
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
                <button type="button" onClick={() => exportNote(note.id, `${note.supportType} approval record`, note.finalNote)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Export PDF</button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
