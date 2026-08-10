"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantProgressNotesForReview } from "@/lib/progress-note-review";

export function ManagerApprovalPanel() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getTenantProgressNotesForReview()
      .then(({ records }) => setPendingCount(records.filter((note) => note.status !== "Approved" && note.status !== "Locked").length))
      .catch(() => setPendingCount(0));
  }, []);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Shift review</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Review submitted notes, request missing details, and retain an approval history.</p>
        </div>
        <StatusBadge label={`${pendingCount} awaiting action`} tone={pendingCount ? "amber" : "green"} />
      </div>
      <Link href="/admin/reviews" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white hover:bg-teal-800">
        <ClipboardCheck size={18} aria-hidden="true" />Open shift review
      </Link>
    </Card>
  );
}
