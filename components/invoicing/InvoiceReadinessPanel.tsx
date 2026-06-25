import { Card, StatusBadge } from "@/components/ui";
import { getInvoiceReadinessDemo } from "@/lib/invoice-readiness";

export function InvoiceReadinessPanel() {
  const readiness = getInvoiceReadinessDemo();
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Evidence-based Invoice Readiness</h2>
      <div className="mt-3 flex items-center gap-3">
        <StatusBadge label={readiness.status} tone="amber" />
        <span className="text-sm text-slate-600">Evidence score {readiness.evidenceScore}%</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {readiness.missing.map((item) => <StatusBadge key={item} label={item} tone="amber" />)}
      </div>
    </Card>
  );
}
