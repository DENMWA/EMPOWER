import type { Metadata } from "next";
import { MfaSecurityPanel } from "@/components/auth/MfaSecurityPanel";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Secure Verification | EmpowerNotes", robots: { index: false, follow: false } };

export default function MfaPage() {
  return <><PageHeader title="One more secure step" description="Verify privileged access." /><Section><MfaSecurityPanel /></Section></>;
}
