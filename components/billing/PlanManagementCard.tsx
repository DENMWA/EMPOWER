"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, CreditCard } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";
import { getLiveSubscriptionUsage } from "@/lib/subscriptions/client-usage";
import { subscriptionTiers, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import { getPricingPlan, plans } from "@/lib/pricing-data";

const planAccents: Record<SubscriptionTier, { selected: string; icon: string }> = {
  solo: { selected: "border-teal-500 bg-mint ring-teal-200", icon: "text-teal-700" },
  practice: { selected: "border-sky-400 bg-skySoft ring-sky-200", icon: "text-sky-700" },
  provider: { selected: "border-amber-400 bg-amber-50 ring-amber-200", icon: "text-gold" },
  enterprise: { selected: "border-navy bg-slate-100 ring-slate-300", icon: "text-navy" }
};

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
    if (endpoint === "checkout" && selectedTier === "enterprise") {
      window.location.assign("/contact");
      return;
    }

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
    <Card className="overflow-hidden border-slate-200 p-0">
      <div className="border-b border-teal-800 bg-navy px-5 py-5 text-white">
      <p className="text-xs font-semibold uppercase text-mint">Current plan</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{planConfirmed ? subscriptionTiers[tier].name : "Unavailable"}</h2>
        <StatusBadge label={statusLabel(status)} tone={statusTone(status)} />
      </div>
      <p className="mt-3 text-3xl font-bold">{planConfirmed ? getPricingPlan(tier).price : "--"}</p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-200">
        <PlanFact label="Status" value={planConfirmed ? statusLabel(status) : "Unavailable"} />
        <PlanFact label="Renews" value={planConfirmed ? formatDate(renewalDate) : "--"} />
        <PlanFact label="Limits" value={planConfirmed ? enforcementMode === "monitor" ? "Monitored" : "Active" : "--"} />
        <PlanFact label="Payments" value="Stripe" />
      </div>

      <div className="p-5">
        <p className="text-sm font-semibold text-ink">Change plan</p>
        <div className="mt-3 grid gap-2">
          {plans.map((plan) => <button key={plan.tier} type="button" onClick={() => setSelectedTier(plan.tier)} aria-pressed={selectedTier === plan.tier} className={`flex min-h-12 items-center justify-between gap-4 rounded-md border px-3 text-left transition ${selectedTier === plan.tier ? `${planAccents[plan.tier].selected} ring-1` : "border-slate-200 bg-white hover:border-teal-300 hover:bg-mist"}`}>
            <span><span className="block text-sm font-semibold text-ink">{plan.shortName}</span><span className="block text-xs text-slate-500">{plan.price}</span></span>
            {selectedTier === plan.tier ? <Check size={17} className={planAccents[plan.tier].icon} /> : <ArrowRight size={16} className="text-slate-400" />}
          </button>)}
        </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" disabled={Boolean(busyAction)} onClick={() => openBillingEndpoint("checkout")} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          <CreditCard size={16} aria-hidden="true" />
          {busyAction === "checkout" ? "Opening..." : selectedTier === "enterprise" ? "Contact Enterprise" : selectedTier === tier ? "Renew plan" : "Switch plan"}
        </button>
        <button type="button" disabled={Boolean(busyAction)} onClick={() => openBillingEndpoint("portal")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
          <ArrowUpRight size={16} aria-hidden="true" />
          {busyAction === "portal" ? "Opening..." : "Manage billing"}
        </button>
      </div>

      {billingMessage ? <p aria-live="polite" className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{billingMessage}</p> : null}
      </div>
    </Card>
  );
}

function PlanFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
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
