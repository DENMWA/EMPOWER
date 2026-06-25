import { PlanRecommendation } from "@/components/onboarding/PlanRecommendation";
import { PageHeader, Section } from "@/components/ui";

export default function SignupPage() {
  return (
    <>
      <PageHeader title="Start Free Trial" description="Demo onboarding recommends a plan before production auth and billing are connected." />
      <Section><PlanRecommendation /></Section>
    </>
  );
}
