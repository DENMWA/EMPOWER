import { ButtonLink, PageHeader, Section } from "@/components/ui";
import { DashboardOperationalLists, ManagerDashboardCards, WorkerDashboardCards } from "@/components/dashboard/DashboardCards";
import { GuidedVoiceDocumentation } from "@/components/voice/GuidedVoiceDocumentation";
import { PlanRecommendation } from "@/components/onboarding/PlanRecommendation";
import { CheckCircle2, FileText, Mic2, ShieldCheck } from "lucide-react";

const proofPoints = [
  { label: "Voice-to-documentation", detail: "Guided speech capture", icon: Mic2 },
  { label: "Audit-aware records", detail: "Quality and detail checks", icon: ShieldCheck },
  { label: "Evidence-ready notes", detail: "Invoice readiness prompts", icon: FileText },
  { label: "Manager visibility", detail: "Review queues and trends", icon: CheckCircle2 }
];

export default function HomePage() {
  return (
    <>
      <PageHeader
        eyebrow="Empower Disability and Social Work"
        title="Speak naturally. Empower turns your voice into clear, person-centred, evidence-backed support records."
        description="A polished SaaS MVP for disability, youth work, social work, NDIS, and community service providers who need safer notes, stronger evidence, and manager-ready documentation."
        actions={<><ButtonLink href="/notes/new">Create Note</ButtonLink><ButtonLink href="/pricing" variant="secondary">View Pricing</ButtonLink></>}
      />
      <Section className="pt-6">
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
