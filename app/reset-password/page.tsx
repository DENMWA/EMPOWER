import type { Metadata } from "next";
import { SupabaseSecurityPanel } from "@/components/auth/SupabaseSecurityPanel";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Reset Your EmpowerNotes Password",
  description: "Choose a new password for your EmpowerNotes account.",
  robots: {
    index: false,
    follow: false
  }
};

export default function ResetPasswordPage() {
  return (
    <>
      <PageHeader
        eyebrow="Secure account recovery"
        title="Create a new password"
        description="Choose a new password to regain access to your EmpowerNotes workspace."
      />
      <Section>
        <SupabaseSecurityPanel />
      </Section>
    </>
  );
}
