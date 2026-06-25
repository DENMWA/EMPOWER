import { Card, StatusBadge } from "@/components/ui";
import { getInvoiceSummaryDemo } from "@/lib/invoice-readiness";

export function InvoiceSummaryCard() {
  const summary = getInvoiceSummaryDemo();
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Invoice Summary</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {Object.entries(summary).map(([key, value]) => (
          <div key={key} className="rounded-md bg-slate-50 p-3">
            <dt className="font-semibold capitalize text-slate-600">{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd className="mt-1 text-ink">{Array.isArray(value) ? value.join(", ") : value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="rounded-md bg-sea px-4 py-3 text-sm font-semibold text-white">Read invoice summary</button>
        <button className="rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold">Mock send invoice</button>
      </div>
      <div className="mt-3"><StatusBadge label="No accounting engine connected" tone="blue" /></div>
    </Card>
  );
}
