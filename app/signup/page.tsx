import type { Metadata } from "next";
import { SimpleSignupForm } from "@/components/onboarding/SimpleSignupForm";
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
      <PageHeader title="Start your free trial" description="One account, one private workspace, 14 days free." />
      <Section>
        <SimpleSignupForm />
      </Section>
    </>
  );
}
