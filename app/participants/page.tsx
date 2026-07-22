import { ClientProfiles } from "@/components/participants/ClientProfiles";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function ParticipantsPage() {
  return (
    <>
      <PageHeader
        eyebrow="My clients"
        title="Assigned client profiles"
        description="Worker-safe client context for support needs, communication preferences, active goals, risk alerts, and known documents. Adding or editing clients remains an admin function."
        actions={<StatusBadge label="View only" tone="blue" />}
      />
      <Section>
        <ClientProfiles />
      </Section>
    </>
  );
}
