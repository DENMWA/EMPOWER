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
      <PageHeader title="Start a 14-day free trial" description="Choose a starting tier, select the workflows to trial, and create a private EmpowerNotes workspace for your Australian care service." />
      <Section className="space-y-6">
        <PlanRecommendation />
        <OrganisationAccountSetup />
      </Section>
    </>
  );
}
