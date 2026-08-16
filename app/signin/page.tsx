import type { Metadata } from "next";
import { SupabaseSecurityPanel } from "@/components/auth/SupabaseSecurityPanel";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign In to EmpowerNotes",
  description: "Sign in securely to your EmpowerNotes workspace with your email and password.",
  alternates: {
    canonical: "/signin"
  },
  robots: { index: false, follow: false }
};

export default function SignInPage() {
  return (
    <>
      <PageHeader
        title="Welcome back"
        description="Your workspace. Your role. Securely connected."
      />
      <Section>
        <SupabaseSecurityPanel redirectAfterSignIn />
      </Section>
    </>
  );
}
