"use client";

import { useEntitlement } from "@/hooks/useEntitlement";
import { Card, StatusBadge } from "@/components/ui";
import { FeatureGate } from "@/components/subscription/FeatureGate";

const safeDefaults = [
  "AI extraction must be reviewed before it creates a verified baseline.",
  "Goal achieved, sustained progress and regression concern require authorised confirmation.",
  "Every progress conclusion must remain traceable to approved evidence.",
  "Downgrades preserve existing records and make advanced settings read-only."
];

export function ProgressIntelligenceSettings() {
  const { tier, entitlements } = useEntitlement();

  return (
    <Card className="border-teal-100 md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Plan-to-Progress Intelligence</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Outcome tracking configuration</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Configure how participant plans become verified baselines and how future notes are compared to those baselines.</p>
        </div>
        <StatusBadge label={tier} tone="blue" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SettingsBlock title="Safety rules" items={safeDefaults} />
        <SettingsBlock title="Enabled on this tier" items={[
          entitlements.managerVerification ? "Manager verification" : "Self verification only",
          entitlements.evidenceStrengthScoring ? "Evidence-strength scoring" : "Basic evidence review",
          entitlements.longitudinalAnalysis ? "Longitudinal analysis" : "Single participant trend",
          entitlements.brandedReports ? "Branded progress reports" : "Basic progress report"
        ]} />
      </div>

      <FeatureGate entitlement="customProgressScales">
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <MiniBuilder title="Progress scale builder" detail="Growth and Enterprise can define organisation-specific labels and scoring levels." />
          <MiniBuilder title="Baseline templates" detail="Create reusable baseline structures for goals, daily living skills, risk, and support routines." />
          <MiniBuilder title="Evidence rules" detail="Set minimum observations, staff variety, review intervals, and accepted evidence sources." />
        </div>
      </FeatureGate>
    </Card>
  );
}

function SettingsBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-semibold text-ink">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function MiniBuilder({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-md border border-teal-100 bg-teal-50/70 p-4">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{detail}</p>
    </div>
  );
}
