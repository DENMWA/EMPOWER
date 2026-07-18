"use client";

import { useEntitlement } from "@/hooks/useEntitlement";
import { getUsageLimitRows } from "@/lib/subscriptions/limits";
import { UsageLimitNotice } from "@/components/subscription/UsageLimitNotice";

const demoUsage = {
  "Active participants": 37,
  "Users": 8,
  "Documents per participant": 3,
  "AI analysed notes/month": 742,
  "Storage": 6.8 * 1024 * 1024 * 1024,
  "Approval stages": 2
};

export function UsageDashboard() {
  const { tier } = useEntitlement();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {getUsageLimitRows(tier).map((row) => (
        <UsageLimitNotice key={row.label} label={row.label} used={demoUsage[row.label as keyof typeof demoUsage] ?? 0} limit={row.value} unit={row.unit} />
      ))}
    </div>
  );
}
