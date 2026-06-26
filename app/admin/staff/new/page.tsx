import { AdminGate } from "@/components/admin/AdminGate";
import { InviteTeamMemberForm } from "@/components/admin/InviteTeamMemberForm";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function AddStaffPage() {
  return (
    <AdminGate>
      <PageHeader
        eyebrow="Add staff"
        title="Invite a new staff member"
        description="Add workers, managers, and admins, then assign participant access before they start using Empower Notes."
        actions={<StatusBadge label="Admin / owner only" tone="blue" />}
      />
      <Section>
        <InviteTeamMemberForm />
      </Section>
    </AdminGate>
  );
}
