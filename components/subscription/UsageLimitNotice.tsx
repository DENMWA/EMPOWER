import { Card, StatusBadge } from "@/components/ui";
import { formatPlanLimit } from "@/lib/subscriptions/limits";

export function UsageLimitNotice({ label, used, limit, unit }: { label: string; used: number; limit: number | null; unit?: string }) {
  const percentage = limit ? Math.round((used / limit) * 100) : 0;
  const tone = limit && percentage >= 100 ? "red" : limit && percentage >= 90 ? "amber" : limit && percentage >= 75 ? "blue" : "green";

  return (
    <Card className="border-sky-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatPlanLimit(used, unit)} / {formatPlanLimit(limit, unit)}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Manual documentation remains available if AI allowance is exhausted. Additional AI analysis requires more allowance or an upgrade.</p>
        </div>
        <StatusBadge label={limit ? `${percentage}%` : "Contract"} tone={tone} />
      </div>
    </Card>
  );
}
