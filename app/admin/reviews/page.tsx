import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { AdminGate } from "@/components/admin/AdminGate";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import { participants, progressNotes, users } from "@/lib/sample-data";

export default function AdminReviewsPage() {
  const reviewQueue = progressNotes.filter((note) => note.status !== "Approved" || note.missingDetails.length > 0 || note.riskyWordingFlags.length > 0);

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
          const participant = participants.find((item) => item.id === note.participantId);
          const worker = users.find((item) => item.id === note.staffId);
          return (
            <Card key={note.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{worker?.name} - {note.supportDate}</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">{participant?.name} - {note.supportType}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Audit score {note.score}% - Billing evidence {note.billingEvidenceScore}%</p>
                </div>
                <StatusBadge label={note.status} tone={note.status === "Approved" ? "green" : "amber"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {note.missingDetails.map((item) => <StatusBadge key={item} label={`Missing: ${item}`} tone="amber" />)}
                {note.riskyWordingFlags.map((item) => <StatusBadge key={item} label={`Risky wording: ${item}`} tone="red" />)}
              </div>
            </Card>
          );
        })}
        <Link href="/notes/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
          <FileCheck2 size={18} aria-hidden="true" />Open note workspace
        </Link>
      </Section>
    </AdminGate>
  );
}
