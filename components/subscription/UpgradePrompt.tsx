import { Card, StatusBadge } from "@/components/ui";

export function UpgradePrompt({ title, message, tier = "Growth" }: { title: string; message: string; tier?: string }) {
  return (
    <Card className="border-amber-200 bg-amber-50/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Plan upgrade</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{message}</p>
        </div>
        <StatusBadge label={tier} tone="amber" />
      </div>
    </Card>
  );
}
