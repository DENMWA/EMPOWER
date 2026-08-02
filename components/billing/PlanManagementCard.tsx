"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CreditCard } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";
import { getLiveSubscriptionUsage } from "@/lib/subscriptions/client-usage";
import { subscriptionTiers, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import { selfServicePlans } from "@/lib/pricing-data";

export function PlanManagementCard() {
  const [tier, setTier] = useState<SubscriptionTier>("practice");
  const [status, setStatus] = useState("Loading");
  const [enforcementMode, setEnforcementMode] = useState<"monitor" | "enforce">("monitor");
  const [renewalDate, setRenewalDate] = useState("");
  const [planConfirmed, setPlanConfirmed] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("practice");
  const [busyAction, setBusyAction] = useState<"checkout" | "portal" | "">("");
  const [billingMessage, setBillingMessage] = useState("");

  useEffect(() => {
    async function loadPlan() {
      const live = await getLiveSubscriptionUsage().catch(() => ({ data: null, error: "Unavailable" }));
      if (live.data) {
        setTier(live.data.tier);
        setSelectedTier(live.data.tier);
        setStatus(live.data.status);
        setEnforcementMode(live.data.enforcementMode);
        setRenewalDate(live.data.trialEndsAt || live.data.currentPeriodEnd);
        setPlanConfirmed(true);
        return;
      }

      setStatus("Plan unavailable");
      setPlanConfirmed(false);
    }

    void loadPlan();
  }, []);

  async function openBillingEndpoint(endpoint: "checkout" | "portal") {
    setBusyAction(endpoint);
    setBillingMessage(endpoint === "checkout" ? "Opening secure checkout..." : "Opening billing portal...");
    try {
      const response = await fetch(`/api/stripe/${endpoint}`, {
        method: "POST",
        headers: { ...getAuthenticatedApiHeaders(), "Content-Type": "application/json" },
        body: endpoint === "checkout" ? JSON.stringify({ tier: selectedTier }) : undefined
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setBillingMessage(result.error || "The billing service could not be opened.");
        setBusyAction("");
        return;
      }
      window.location.assign(result.url);
    } catch {
      setBillingMessage("The billing service is temporarily unavailable. Try again.");
      setBusyAction("");
    }
  }

  return (
    <Card>
      <p className="text-sm font-semibold uppercase tracking-wide text-sea">Admin plan control</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">{planConfirmed ? `Current plan: ${subscriptionTiers[tier].name}` : "Current plan unavailable"}</h2>
        <StatusBadge label={statusLabel(status)} tone={statusTone(status)} />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Subscription controls are available only to organisation administrators. Staff do not see plan or pricing controls.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PlanFact label="Plan status" value={planConfirmed ? "Confirmed" : "Awaiting secure workspace"} />
        <PlanFact label="Limit mode" value={planConfirmed ? enforcementMode === "monitor" ? "Monitoring only" : "Active" : "Not available"} />
        <PlanFact label="Trial or renewal" value={planConfirmed ? formatDate(renewalDate) : "Not available"} />
        <PlanFact label="Billing" value="Secure Stripe checkout" />
      </div>

      <label className="mt-5 block max-w-sm text-sm font-semibold text-slate-700">
        Plan for checkout
        <select value={selectedTier} onChange={(event) => setSelectedTier(event.target.value as SubscriptionTier)} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-ink shadow-sm">
          {selfServicePlans.map((plan) => (
            <option key={plan.tier} value={plan.tier}>{plan.name} - {plan.price}</option>
          ))}
        </select>
      </label>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={Boolean(busyAction)} onClick={() => openBillingEndpoint("checkout")} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
          <CreditCard size={16} aria-hidden="true" />
          {busyAction === "checkout" ? "Opening..." : "Subscribe securely"}
        </button>
        <button type="button" disabled={Boolean(busyAction)} onClick={() => openBillingEndpoint("portal")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
          <ArrowUpRight size={16} aria-hidden="true" />
          {busyAction === "portal" ? "Opening..." : "Manage billing"}
        </button>
      </div>

      {billingMessage ? <p aria-live="polite" className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{billingMessage}</p> : null}
      <p className="mt-4 text-xs leading-5 text-slate-500">Plan access changes only after Stripe confirms payment through the secure webhook.</p>
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
