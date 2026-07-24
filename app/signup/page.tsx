import type { Metadata } from "next";
import Link from "next/link";
import { SupabaseSecurityPanel } from "@/components/auth/SupabaseSecurityPanel";
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
        <SupabaseSecurityPanel />
        <OrganisationAccountSetup />
        <p className="text-center text-sm leading-6 text-slate-600">
          By creating an EmpowerNotes workspace, you agree to the <Link href="/legal/terms" className="font-semibold text-teal-700 hover:text-teal-900">Terms of Service</Link> and acknowledge the <Link href="/legal/privacy" className="font-semibold text-teal-700 hover:text-teal-900">Privacy Policy</Link>.
        </p>
      </Section>
    </>
  );
}
