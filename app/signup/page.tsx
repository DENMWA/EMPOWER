import type { Metadata } from "next";
import { OrganisationAccountSetup } from "@/components/onboarding/OrganisationAccountSetup";
import { PlanRecommendation } from "@/components/onboarding/PlanRecommendation";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Start EmpowerNotes for Your Australian Care Team",
  description:
    "Start EmpowerNotes for Australian NDIS, disability support, social work, youth work, and community service documentation.",
  alternates: {
    canonical: "/signup"
  }
};

export default function SignupPage() {
  return (
    <>
      <PageHeader title="Start Free Trial" description="Set up an organisation workspace and choose the right EmpowerNotes plan for your Australian care team." />
      <Section className="space-y-6">
        <OrganisationAccountSetup />
        <PlanRecommendation />
      </Section>
    </>
  );
}
