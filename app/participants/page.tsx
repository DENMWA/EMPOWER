import { ClientProfiles } from "@/components/participants/ClientProfiles";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function ParticipantsPage() {
  return (
    <>
      <PageHeader
        eyebrow="My clients"
        title="Assigned client profiles"
        description="Your assigned support profiles, communication preferences, active goals, risk alerts, and known documents. Profile changes are managed by authorised team leaders."
        actions={<StatusBadge label="View only" tone="blue" />}
      />
      <Section>
        <ClientProfiles />
      </Section>
    </>
  );
}
