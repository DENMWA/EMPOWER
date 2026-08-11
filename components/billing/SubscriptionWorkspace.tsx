"use client";

import { useEffect, useState } from "react";
import { PlanManagementCard } from "@/components/billing/PlanManagementCard";
import { UsageSummary } from "@/components/billing/UsageSummary";
import { fullAdminRoles } from "@/lib/admin-permissions";
import { getStoredAccessToken } from "@/lib/supabase-rest";

export function SubscriptionWorkspace() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return setAllowed(false);
    fetch("/api/auth/access?mode=admin&permission=settings", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((response) => response.json())
      .then((result: { allowed?: boolean; role?: string }) => setAllowed(Boolean(result.allowed && result.role && fullAdminRoles.has(result.role))))
      .catch(() => setAllowed(false));
  }, []);
  if (allowed === null) return <div className="min-h-64 animate-pulse rounded-md bg-slate-100" aria-label="Loading plan details" />;
  if (!allowed) return <div className="rounded-md border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-ink">Owner access required</h2><p className="mt-2 text-sm text-slate-600">Plan controls are available to the organisation owner or full administrator.</p></div>;
  return <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"><PlanManagementCard /><UsageSummary /></div>;
}
