import type { Metadata } from "next";
import { PlatformEmailSignIn } from "@/components/platform/PlatformEmailSignIn";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Developer Console Sign In | EmpowerNotes",
  robots: { index: false, follow: false }
};

export default function PlatformSignInPage() {
  return (
    <>
      <PageHeader
        eyebrow="Internal platform"
        title="Developer console sign in"
        description="Use a secure email link to access the EmpowerNotes owner console."
      />
      <Section>
        <PlatformEmailSignIn />
      </Section>
    </>
  );
}
