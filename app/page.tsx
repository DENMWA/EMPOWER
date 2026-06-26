import { ButtonLink, Section, StatusBadge } from "@/components/ui";
import { DashboardOperationalLists, ManagerDashboardCards, WorkerDashboardCards } from "@/components/dashboard/DashboardCards";
import { GuidedVoiceDocumentation } from "@/components/voice/GuidedVoiceDocumentation";
import { PlanRecommendation } from "@/components/onboarding/PlanRecommendation";
import { CheckCircle2, FileText, Mic2, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

const proofPoints = [
  { label: "Voice-to-documentation", detail: "Guided speech capture", icon: Mic2 },
  { label: "Audit-aware records", detail: "Quality and detail checks", icon: ShieldCheck },
  { label: "Evidence-ready notes", detail: "Invoice readiness prompts", icon: FileText },
  { label: "Manager visibility", detail: "Review queues and trends", icon: CheckCircle2 }
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-md bg-mint px-3 py-1 text-sm font-semibold text-teal-900">
              <Sparkles size={16} aria-hidden="true" />
              Premium documentation intelligence for care teams
            </p>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-ink sm:text-6xl">
              Speak naturally. Empower creates safer, audit-ready support records.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              A polished command centre for disability, social work, youth work, NDIS, and community service providers who need person-centred records, stronger evidence, and manager-ready oversight.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/notes/new">Create premium note</ButtonLink>
              <ButtonLink href="/dashboard" variant="secondary">Open dashboard</ButtonLink>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {["AI quality score", "Guided voice capture", "Evidence readiness"].map((item) => (
                <div key={item} className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-ink">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-ink p-4 shadow-lift">
            <div className="rounded-md bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-sea">Live documentation command centre</p>
                  <h2 className="mt-1 text-2xl font-bold text-ink">Today&apos;s evidence health</h2>
                </div>
                <StatusBadge label="Manager view" tone="blue" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["86%", "Audit readiness"],
                  ["12", "Review queue"],
                  ["9", "Invoice ready"]
                ].map(([value, label]) => (
                  <div key={label} className="rounded-md bg-slate-50 p-4">
                    <p className="text-3xl font-bold text-ink">{value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-md border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-mint text-teal-900"><TrendingUp size={20} aria-hidden="true" /></span>
                  <div>
                    <p className="font-semibold text-ink">Joseph K. community access note</p>
                    <p className="text-sm text-slate-600">Risk wording improved, goal link suggested, missing details flagged.</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge label="Person-centred" tone="green" />
                  <StatusBadge label="Needs location" tone="amber" />
                  <StatusBadge label="Evidence 68%" tone="blue" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Section className="pt-8">
        <div className="grid gap-3 rounded-md border border-slate-200 bg-white/80 p-3 shadow-soft backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
          {proofPoints.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.label} className="flex items-center gap-3 rounded-md bg-slate-50 px-4 py-3">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white"><Icon size={18} aria-hidden="true" /></span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{point.label}</span>
                  <span className="block text-xs text-slate-600">{point.detail}</span>
                </span>
              </div>
            );
          })}
        </div>
      </Section>
      <Section><WorkerDashboardCards /></Section>
      <Section><GuidedVoiceDocumentation /></Section>
      <Section><ManagerDashboardCards /></Section>
      <Section><DashboardOperationalLists /></Section>
      <Section><PlanRecommendation /></Section>
    </>
  );
}
