import { Card, StatusBadge } from "@/components/ui";

export function SelfCertificationPanel() {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">Sole-provider Self-certification</h2>
        <StatusBadge label="Locks record after confirmation" tone="amber" />
      </div>
      <p className="mt-3 rounded-md bg-slate-50 p-4 font-semibold text-ink">I confirm this record is accurate, complete, and reflects the support delivered.</p>
      <p className="mt-3 text-sm leading-6 text-slate-700">When self-certified, the note is timestamped, locked, marked owner-approved, preserved with the original rough note/transcript, checked for invoice readiness, and logged in the audit trail.</p>
      <button className="mt-4 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white">Self-certify and lock note</button>
    </Card>
  );
}
