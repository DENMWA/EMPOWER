"use client";

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getCurrentSubscriptionTier, setCurrentSubscriptionTier } from "@/lib/subscriptions/browser-tier";
import { subscriptionTiers, type SubscriptionTier } from "@/lib/subscriptions/tiers";

export function PlanManagementCard() {
  const [tier, setTier] = useState<SubscriptionTier>("practice");
  const [message, setMessage] = useState("");
  const upgradeOptions = [
    { tier: "provider" as const, name: "Provider", detail: "For multi-team operations, configurable dashboards, and scheduled reports." },
    { tier: "enterprise" as const, name: "Enterprise", detail: "For SSO, integrations, custom governance, and organisation-wide intelligence." }
  ];

  useEffect(() => {
    setTier(getCurrentSubscriptionTier());
  }, []);

  function choosePlan(nextTier: SubscriptionTier) {
    setCurrentSubscriptionTier(nextTier);
    setTier(nextTier);
    setMessage(`${subscriptionTiers[nextTier].name} selected for testing. Connect Stripe checkout before using this as a paid production change.`);
  }

  return (
    <Card>
      <p className="text-sm font-semibold uppercase tracking-wide text-sea">Admin plan control</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">Current plan: {subscriptionTiers[tier].name}</h2>
        <StatusBadge label="Stripe pending" tone="amber" />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">Billing and subscription controls are visible only in admin. Workers and employees do not see pricing or plan controls in the main app.</p>

      <div className="mt-4 grid gap-3">
        {upgradeOptions.map((option) => (
          <div key={option.name} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-ink">{tier === option.tier ? "Selected" : "Upgrade"} to {option.name}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{option.detail}</p>
            <button type="button" onClick={() => choosePlan(option.tier)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink hover:border-teal-400">
              <CreditCard size={16} aria-hidden="true" />
              Select for testing
            </button>
          </div>
        ))}
      </div>

      <a href="/pricing" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white">
        <ExternalLink size={16} aria-hidden="true" />
        View public pricing
      </a>
      {message ? <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{message}</p> : null}
      <p className="mt-3 text-xs text-slate-500">Stripe checkout should replace the testing selector before production billing is switched on.</p>
    </Card>
  );
}
