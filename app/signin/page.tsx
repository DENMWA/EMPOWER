import type { Metadata } from "next";
import { SupabaseSecurityPanel } from "@/components/auth/SupabaseSecurityPanel";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign In to EmpowerNotes",
  description: "Sign in to EmpowerNotes with email, phone code, and authenticator 2FA.",
  alternates: {
    canonical: "/signin"
  }
};

export default function SignInPage() {
  return (
    <>
      <PageHeader
        eyebrow="Secure sign in"
        title="Sign in before saving records"
        description="Use secure sign-in so client profiles, notes, incidents, documents, reports, and billing records save to the organisation workspace."
      />
      <Section>
        <SupabaseSecurityPanel />
      </Section>
    </>
  );
}
