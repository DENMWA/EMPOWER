import { ButtonLink, PageHeader, Section } from "@/components/ui";
import { DashboardOperationalLists, ManagerDashboardCards, WorkerDashboardCards } from "@/components/dashboard/DashboardCards";
import { GuidedVoiceDocumentation } from "@/components/voice/GuidedVoiceDocumentation";
import { PlanRecommendation } from "@/components/onboarding/PlanRecommendation";

export default function HomePage() {
  return (
    <>
      <PageHeader
        eyebrow="Empower Disability and Social Work"
        title="Speak naturally. Empower turns your voice into clear, person-centred, evidence-backed support records."
        description="A polished SaaS MVP for disability, youth work, social work, NDIS, and community service providers who need safer notes, stronger evidence, and manager-ready documentation."
        actions={<><ButtonLink href="/notes/new">Create Note</ButtonLink><ButtonLink href="/pricing" variant="secondary">View Pricing</ButtonLink></>}
      />
      <Section><WorkerDashboardCards /></Section>
      <Section><GuidedVoiceDocumentation /></Section>
      <Section><ManagerDashboardCards /></Section>
      <Section><DashboardOperationalLists /></Section>
      <Section><PlanRecommendation /></Section>
    </>
  );
}
