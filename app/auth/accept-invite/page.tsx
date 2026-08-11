import type { Metadata } from "next";
import { InviteAcceptanceForm } from "@/components/auth/InviteAcceptanceForm";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Accept EmpowerNotes Invitation", robots: { index: false, follow: false } };

export default function AcceptInvitePage() {
  return <><PageHeader eyebrow="Secure invitation" title="Welcome to EmpowerNotes" description="Confirm your invitation to join the organisation workspace." /><Section><InviteAcceptanceForm /></Section></>;
}
