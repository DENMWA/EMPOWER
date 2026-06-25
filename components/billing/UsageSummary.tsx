import { Card } from "@/components/ui";

const items = [
  ["Active users", "8 of 10 included"],
  ["AI notes used this month", "142"],
  ["Document uploads", "26"],
  ["Guided Voice", "Enabled"],
  ["Document Intelligence", "Enabled"],
  ["Invoice-readiness", "Enabled"]
];

export function UsageSummary() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Usage Summary</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-50 p-3">
            <dt className="text-sm font-semibold text-slate-600">{label}</dt>
            <dd className="mt-1 font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
