"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, Sparkles } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { setCurrentSubscriptionTier } from "@/lib/subscriptions/browser-tier";
import { subscriptionTiers, type SubscriptionTier } from "@/lib/subscriptions/tiers";

type BusinessType = "independent" | "practice" | "provider" | "enterprise";

const trialStorageKey = "empowernotes:trial";
const useCaseStorageKey = "empowernotes:onboarding-use-cases";

const businessTypes: Record<BusinessType, { label: string; detail: string; recommendedTier: SubscriptionTier | "enterprise" }> = {
  independent: {
    label: "Independent provider",
    detail: "Sole trader, independent support worker, support coordinator, or solo practitioner.",
    recommendedTier: "solo"
  },
  practice: {
    label: "Small practice/team",
    detail: "Small NDIS, allied health, behaviour support, or community service team.",
    recommendedTier: "practice"
  },
  provider: {
    label: "Growing provider",
    detail: "Multi-team provider needing standardised workflows, reporting, and oversight.",
    recommendedTier: "provider"
  },
  enterprise: {
    label: "Large organisation",
    detail: "Multi-site, complex governance, integrations, SSO, and executive reporting.",
    recommendedTier: "enterprise"
  }
};

const selectableTiers: Array<{ tier: SubscriptionTier; promise: string }> = [
  { tier: "solo", promise: "Documentation efficiency for independent providers." },
  { tier: "practice", promise: "Team oversight, manager review, and evidence quality." },
  { tier: "provider", promise: "Standardised operations, reporting, and configurable workflows." }
];

const useCases = [
  "Progress notes",
  "Incident reporting",
  "Document Vault",
  "Plan-to-Progress",
  "Rostering/admin reports",
  "Billing evidence"
];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function PlanRecommendation() {
  const [businessType, setBusinessType] = useState<BusinessType>("practice");
  const recommended = businessTypes[businessType].recommendedTier;
  const initialTier = recommended === "enterprise" ? "provider" : recommended;
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(initialTier);
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>(["Progress notes", "Incident reporting", "Document Vault"]);
  const [message, setMessage] = useState("");

  const trialEnd = useMemo(() => addDays(new Date(), 14), []);
  const recommendedLabel = recommended === "enterprise" ? "Enterprise discovery" : subscriptionTiers[recommended].name;

  function chooseBusinessType(type: BusinessType) {
    setBusinessType(type);
    const nextRecommended = businessTypes[type].recommendedTier;
    setSelectedTier(nextRecommended === "enterprise" ? "provider" : nextRecommended);
    setMessage("");
  }

  function toggleUseCase(useCase: string) {
    setSelectedUseCases((current) => current.includes(useCase) ? current.filter((item) => item !== useCase) : [...current, useCase]);
  }

  function startTrial() {
    setCurrentSubscriptionTier(selectedTier);
    window.localStorage.setItem(trialStorageKey, JSON.stringify({
      tier: selectedTier,
      status: "trialing",
      trialDays: 14,
      startedAt: new Date().toISOString(),
      endsAt: trialEnd.toISOString()
    }));
    window.localStorage.setItem(useCaseStorageKey, JSON.stringify(selectedUseCases));
    window.dispatchEvent(new Event("empowernotes:trial-updated"));
    setMessage(`${subscriptionTiers[selectedTier].name} trial selected. Your 14-day trial runs until ${trialEnd.toLocaleDateString("en-AU")}.`);
  }

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">14-day trial setup</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Choose the right starting plan</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Start with the tier that best matches the service. You can change plan before billing starts. No card is required during early testing.
          </p>
        </div>
        <StatusBadge label="14 days free" tone="green" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {(Object.entries(businessTypes) as Array<[BusinessType, typeof businessTypes[BusinessType]]>).map(([key, option]) => (
          <button
            key={key}
            type="button"
            onClick={() => chooseBusinessType(key)}
            className={`rounded-md border p-4 text-left transition hover:border-teal-500 hover:bg-skySoft ${businessType === key ? "border-teal-600 bg-teal-50 ring-2 ring-teal-100" : "border-slate-200 bg-white"}`}
          >
            <span className="block font-semibold text-ink">{option.label}</span>
            <span className="mt-2 block text-sm leading-6 text-slate-600">{option.detail}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-md border border-sky-100 bg-sky-50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Sparkles size={18} className="text-teal-700" aria-hidden="true" />
          <p className="font-semibold text-ink">Recommended: {recommendedLabel}</p>
          {recommended === "enterprise" ? <StatusBadge label="Book discovery" tone="amber" /> : <StatusBadge label="Can change" tone="blue" />}
        </div>
        {recommended === "enterprise" ? (
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Enterprise should use a booked discovery and structured pilot. For immediate hands-on testing, start with Provider and move to an Enterprise conversation.
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {selectableTiers.map((plan) => (
          <label key={plan.tier} className={`rounded-md border p-4 ${selectedTier === plan.tier ? "border-teal-600 bg-teal-50 ring-2 ring-teal-100" : "border-slate-200 bg-white"}`}>
            <span className="flex items-start gap-3">
              <input type="radio" name="trial-tier" className="mt-1 h-4 w-4 accent-teal-700" checked={selectedTier === plan.tier} onChange={() => setSelectedTier(plan.tier)} />
              <span>
                <span className="block font-semibold text-ink">{subscriptionTiers[plan.tier].name}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{plan.promise}</span>
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-teal-700" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-700">Main workflows to trial</p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <label key={useCase} className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={selectedUseCases.includes(useCase)} onChange={() => toggleUseCase(useCase)} />
              {useCase}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={startTrial} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift">
          <CheckCircle2 size={17} aria-hidden="true" />
          Start 14-day trial
        </button>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <CalendarDays size={17} aria-hidden="true" />
          Trial ends {trialEnd.toLocaleDateString("en-AU")}
        </span>
      </div>

      {message ? <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
    </Card>
  );
}
