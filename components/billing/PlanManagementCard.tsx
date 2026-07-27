"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CreditCard } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getCurrentSubscriptionTier } from "@/lib/subscriptions/browser-tier";
import { getLiveSubscriptionUsage } from "@/lib/subscriptions/client-usage";
import { subscriptionTiers, type SubscriptionTier } from "@/lib/subscriptions/tiers";

export function PlanManagementCard() {
  const [tier, setTier] = useState<SubscriptionTier>("practice");
  const [status, setStatus] = useState("Loading");
  const [enforcementMode, setEnforcementMode] = useState<"monitor" | "enforce">("monitor");
  const [renewalDate, setRenewalDate] = useState("");
  const [source, setSource] = useState<"supabase" | "local-fallback">("local-fallback");

  useEffect(() => {
    async function loadPlan() {
      const live = await getLiveSubscriptionUsage().catch(() => ({ data: null, error: "Unavailable" }));
      if (live.data) {
        setTier(live.data.tier);
        setStatus(live.data.status);
        setEnforcementMode(live.data.enforcementMode);
        setRenewalDate(live.data.trialEndsAt || live.data.currentPeriodEnd);
        setSource("supabase");
        return;
      }

      setTier(getCurrentSubscriptionTier());
      setStatus("Plan confirmation pending");
      setSource("local-fallback");
    }

    void loadPlan();
  }, []);

  return (
    <Card>
      <p className="text-sm font-semibold uppercase tracking-wide text-sea">Admin plan control</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">Current plan: {subscriptionTiers[tier].name}</h2>
        <StatusBadge label={statusLabel(status)} tone={statusTone(status)} />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Subscription controls are available only to organisation administrators. Staff do not see plan or pricing controls.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PlanFact label="Plan source" value={source === "supabase" ? "Secure workspace" : "Temporary local estimate"} />
        <PlanFact label="Limit mode" value={enforcementMode === "monitor" ? "Monitoring only" : "Active"} />
        <PlanFact label="Trial or renewal" value={formatDate(renewalDate)} />
        <PlanFact label="Billing" value="Stripe connection pending" />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <a href="/pricing" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white">
          <CreditCard size={16} aria-hidden="true" />
          View plan options
        </a>
        <a href="/contact" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400">
          <ArrowUpRight size={16} aria-hidden="true" />
          Request an upgrade
        </a>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">Paid plan changes will be confirmed by Stripe after checkout is connected.</p>
    </Card>
  );
}

function PlanFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString("en-AU");
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function statusTone(status: string): "green" | "amber" | "red" | "blue" {
  if (status === "active") return "green";
  if (status === "trialing") return "blue";
  if (status === "past_due" || status.toLowerCase().includes("pending")) return "amber";
  return "red";
}
