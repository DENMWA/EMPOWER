import type { Metadata } from "next";
import { SupabaseSecurityPanel } from "@/components/auth/SupabaseSecurityPanel";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign In to EmpowerNotes",
  description: "Sign in securely to your EmpowerNotes workspace with your email and password.",
  alternates: {
    canonical: "/signin"
  }
};

export default function SignInPage() {
  return (
    <>
      <PageHeader
        eyebrow="Secure sign in"
        title="Sign in to your EmpowerNotes workspace"
        description="Use your assigned email and password. EmpowerNotes opens administrator or staff tools according to the role connected to those credentials."
      />
      <Section>
        <SupabaseSecurityPanel redirectAfterSignIn />
      </Section>
    </>
  );
}
