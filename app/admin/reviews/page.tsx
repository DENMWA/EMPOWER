"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, LockKeyhole, MessageSquareMore } from "lucide-react";
import { AdminGate } from "@/components/admin/AdminGate";
import { ServerFeatureGate } from "@/components/subscription/ServerFeatureGate";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import {
  getTenantProgressNotesForReview,
  reviewTenantProgressNote,
  type ProgressNoteReviewItem
} from "@/lib/progress-note-review";

const certifyingRoles = new Set(["owner", "admin", "sole_provider"]);

export default function AdminReviewsPage() {
  const [notes, setNotes] = useState<ProgressNoteReviewItem[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [canCertify, setCanCertify] = useState(false);

  const loadNotes = useCallback(async () => {
    const result = await getTenantProgressNotesForReview();
    setNotes(result.records);
    if (result.error) setMessage(`Review records could not be loaded. ${result.error}`);
  }, []);

  useEffect(() => {
    void loadNotes();
    fetch("/api/auth/access?mode=admin&permission=shift_verification", { cache: "no-store" })
      .then((response) => response.json())
      .then((access: { allowed?: boolean; role?: string }) => setCanCertify(Boolean(access.allowed && access.role && certifyingRoles.has(access.role))))
      .catch(() => setCanCertify(false));
  }, [loadNotes]);

  async function handleReview(note: ProgressNoteReviewItem, action: "approve" | "request_details" | "certify") {
    const reviewComments = comments[note.id] || "";
    if (action === "request_details" && !reviewComments.trim()) {
      setMessage("Add the details the staff member needs to provide before sending the note back.");
      return;
    }

    setSavingId(note.id);
    setMessage("");
    const result = await reviewTenantProgressNote(note.id, action, reviewComments);
    setSavingId("");
    if (!result.savedToCloud) {
      setMessage(`Review action was not saved. ${result.error}`);
      return;
    }

    setMessage(`${note.clientName}'s progress note is now ${result.status}.`);
    setComments((current) => ({ ...current, [note.id]: "" }));
    await loadNotes();
  }

  const pendingCount = notes.filter((note) => note.status !== "Approved" && note.status !== "Locked").length;

  return (
    <AdminGate permission="shift_verification">
      <ServerFeatureGate category="operations" feature="managerReview" title="Manager review requires Practice or above">
        <PageHeader
          eyebrow="Shift review"
          title="Review, return or certify progress notes"
          description="Approve complete records, request specific details, or certify a final note when you hold full administrator access."
          actions={<StatusBadge label={`${pendingCount} awaiting action`} tone={pendingCount ? "amber" : "green"} />}
        />
        <Section className="space-y-4">
          {message ? <p role="status" className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{message}</p> : null}
          {notes.map((note) => {
            const locked = note.status === "Locked";
            const saving = savingId === note.id;
            return (
              <Card key={note.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">{note.staffName} · {new Date(note.supportDate).toLocaleDateString("en-AU")}</p>
                    <h2 className="mt-1 text-xl font-semibold text-ink">{note.clientName} · {note.supportType}</h2>
                    <p className="mt-2 text-sm text-slate-600">Quality {note.qualityScore}% · Billing evidence {note.billingEvidenceScore}%</p>
                    {note.qualityBreakdown ? (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer font-semibold text-sea">Quality breakdown</summary>
                        <dl className="mt-2 grid gap-x-4 gap-y-1 text-slate-600 sm:grid-cols-2">
                          <div className="flex justify-between gap-3"><dt>Person-centred</dt><dd className="font-semibold text-ink">{note.qualityBreakdown.personCentredLanguage}/10</dd></div>
                          <div className="flex justify-between gap-3"><dt>Objective wording</dt><dd className="font-semibold text-ink">{note.qualityBreakdown.objectiveWording}/10</dd></div>
                          <div className="flex justify-between gap-3"><dt>Detail</dt><dd className="font-semibold text-ink">{note.qualityBreakdown.detailLevel}/10</dd></div>
                          <div className="flex justify-between gap-3"><dt>Risk clarity</dt><dd className="font-semibold text-ink">{note.qualityBreakdown.riskClarity}/10</dd></div>
                          <div className="flex justify-between gap-3"><dt>Goal</dt><dd className="font-semibold text-ink">{note.qualityBreakdown.goalConnection}</dd></div>
                          <div className="flex justify-between gap-3"><dt>Follow-up</dt><dd className="font-semibold text-ink">{note.qualityBreakdown.followUpAction}</dd></div>
                        </dl>
                      </details>
                    ) : null}
                  </div>
                  <StatusBadge label={note.status} tone={note.status === "Approved" || locked ? "green" : "amber"} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {note.missingDetails.map((item) => <StatusBadge key={item} label={`Missing: ${item}`} tone="amber" />)}
                  {note.riskyWordingFlags.map((item) => <StatusBadge key={item} label={`Review wording: ${item}`} tone="red" />)}
                </div>
                <p className="mt-4 max-h-48 overflow-auto rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-700">{note.body}</p>
                {note.latestReview ? (
                  <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
                    <span className="font-semibold text-ink">Latest review:</span> {note.latestReview.action.replace("_", " ")} by {note.latestReview.reviewerName} on {new Date(note.latestReview.createdAt).toLocaleString("en-AU")}
                    {note.latestReview.comments ? <p className="mt-1">{note.latestReview.comments}</p> : null}
                  </div>
                ) : null}
                {!locked ? (
                  <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                    <label className="block text-sm font-semibold text-ink" htmlFor={`review-${note.id}`}>Review comments or further details required</label>
                    <textarea
                      id={`review-${note.id}`}
                      value={comments[note.id] || ""}
                      onChange={(event) => setComments((current) => ({ ...current, [note.id]: event.target.value }))}
                      className="min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-ink outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      placeholder="Add a concise review comment. This is required when requesting more detail."
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={saving} onClick={() => void handleReview(note, "approve")} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={18} />Approve</button>
                      <button type="button" disabled={saving} onClick={() => void handleReview(note, "request_details")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 disabled:opacity-50"><MessageSquareMore size={18} />Request further details</button>
                      {canCertify ? <button type="button" disabled={saving} onClick={() => void handleReview(note, "certify")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink disabled:opacity-50"><LockKeyhole size={18} />Certify and lock</button> : null}
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
          {!notes.length ? <Card><p className="font-semibold text-ink">No progress notes are available for review.</p><p className="mt-2 text-sm text-slate-600">Submitted shift notes will appear here with their client, staff member and quality signals.</p></Card> : null}
          <Link href="/notes/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800"><FileCheck2 size={18} />Open note workspace</Link>
        </Section>
      </ServerFeatureGate>
    </AdminGate>
  );
}
