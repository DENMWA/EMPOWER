"use client";

import { useEntitlement } from "@/hooks/useEntitlement";
import { Card, StatusBadge } from "@/components/ui";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { subscriptionTiers, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import { samplePlanExtractions, participantProgressGoals } from "@/lib/plan-progress/sample-data";
import { formatPlanLimit, getUsageLimitRows } from "@/lib/subscriptions/limits";
import { GoalProgressCard } from "@/components/participants/progress/GoalProgressCard";
import { PlanUploadReviewCard } from "@/components/participants/plans/PlanUploadReviewCard";

export function ProgressDashboard() {
  const { tier, setTier, entitlements } = useEntitlement();
  const goal = participantProgressGoals[0];

  return (
    <div className="space-y-6">
      <Card className="border-sky-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Plan-to-Progress Intelligence</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Verified plan baseline to progress evidence</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Upload plans, review AI extraction, verify a baseline, link future notes to goals and track evidence-backed progress over time.</p>
          </div>
          <StatusBadge label={subscriptionTiers[tier].name} tone="blue" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[240px_1fr]">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Subscription tier for testing
            <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={tier} onChange={(event) => setTier(event.target.value as SubscriptionTier)}>
              {Object.entries(subscriptionTiers).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
            </select>
          </label>
          <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
            {getUsageLimitRows(tier).slice(0, 6).map((row) => (
              <p key={row.label} className="rounded-md bg-slate-50 p-2"><span className="font-semibold">{row.label}:</span> {formatPlanLimit(row.value, row.unit)}</p>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard label="Active goals" value={participantProgressGoals.length} />
        <SummaryCard label="Current plans" value={1} />
        <SummaryCard label="Last baseline update" value="24 Jun 2026" />
      </div>

      <PlanUploadReviewCard />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Human verification queue</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">AI extraction is reviewed before becoming a baseline</h2>
          </div>
          <StatusBadge label="Authorised review required" tone="amber" />
        </div>
        <div className="mt-4 grid gap-3">
          {samplePlanExtractions.map((item) => (
            <div key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">{item.title}</p>
                <StatusBadge label={`${Math.round(item.confidenceScore * 100)}% confidence`} tone="blue" />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{item.interpretedText}</p>
              <p className="mt-2 text-xs text-slate-500">Source: page {item.sourcePage}, {item.sourceSection}. Status: {item.verificationStatus}.</p>
            </div>
          ))}
        </div>
      </Card>

      <FeatureGate entitlement="basicCharts">
        <GoalProgressCard goal={goal} />
      </FeatureGate>

      <FeatureGate entitlement="advancedCharts">
        <Card className="border-teal-100">
          <h2 className="text-xl font-semibold text-ink">Team+ chart intelligence</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Support-level trend, evidence count, evidence-strength trend and contradiction indicators are enabled on this tier.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge label="Support trend" tone={entitlements.advancedCharts ? "green" : "amber"} />
            <StatusBadge label="Evidence strength" tone={entitlements.evidenceStrengthScoring ? "green" : "amber"} />
            <StatusBadge label="Contradiction detection" tone={entitlements.contradictionDetection ? "green" : "amber"} />
          </div>
        </Card>
      </FeatureGate>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </Card>
  );
}
