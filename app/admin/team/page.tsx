import { InviteTeamMemberForm } from "@/components/admin/InviteTeamMemberForm";
import { TeamMembersTable } from "@/components/admin/TeamMembersTable";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function AdminTeamPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin workspace"
        title="Team members and access control"
        description="Invite staff, assign participant/client access, choose roles, and monitor documentation quality from one premium admin surface."
        actions={<StatusBadge label="Owner/admin/service manager only" tone="blue" />}
      />
      <Section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <InviteTeamMemberForm />
        <TeamMembersTable />
      </Section>
    </>
  );
}
