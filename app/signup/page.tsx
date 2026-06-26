import type { Metadata } from "next";
import { PlanRecommendation } from "@/components/onboarding/PlanRecommendation";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Start Empower Notes for Your Australian Care Team",
  description:
    "Start Empower Notes for Australian NDIS, disability support, social work, youth work, and community service documentation.",
  alternates: {
    canonical: "/signup"
  }
};

export default function SignupPage() {
  return (
    <>
      <PageHeader title="Start Free Trial" description="Demo onboarding recommends a plan for Australian care teams before production auth and billing are connected." />
      <Section><PlanRecommendation /></Section>
    </>
  );
}
