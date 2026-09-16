"use client";

import { useEntitlement } from "@/hooks/useEntitlement";
import { Card, StatusBadge } from "@/components/ui";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { subscriptionTiers } from "@/lib/subscriptions/tiers";

export function ProgressIntelligenceSettings() {
  const { tier, entitlements } = useEntitlement();
  const enabledFeatures = [
    entitlements.managerVerification ? "Manager verified" : "Self verified",
    entitlements.evidenceStrengthScoring ? "Evidence scoring" : "Basic evidence",
    entitlements.longitudinalAnalysis ? "Trend analysis" : "Single-client trend",
    entitlements.brandedReports ? "Branded reports" : "Basic reports"
  ];

  return (
    <Card className="border-teal-100 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Plan-to-Progress Intelligence</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Outcome tracking</h2>
        </div>
        <StatusBadge label={subscriptionTiers[tier].shortName} tone="blue" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {enabledFeatures.map((feature) => <StatusBadge key={feature} label={feature} tone="green" />)}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">AI insights remain review-first and evidence-linked.</p>

      <FeatureGate entitlement="customProgressScales" upgradeHref="/pricing">
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <MiniBuilder title="Progress scales" />
          <MiniBuilder title="Baseline templates" />
          <MiniBuilder title="Evidence rules" />
        </div>
      </FeatureGate>
    </Card>
  );
}

function MiniBuilder({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-teal-100 bg-teal-50/70 p-4">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-5 text-slate-700">Available on higher tiers.</p>
    </div>
  );
}
