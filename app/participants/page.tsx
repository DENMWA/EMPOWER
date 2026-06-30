import { ClientProfiles } from "@/components/participants/ClientProfiles";
import { PageHeader, Section } from "@/components/ui";

export default function ParticipantsPage() {
  return (
    <>
      <PageHeader title="Participant and Client Profiles" description="Profiles connect support needs, goals, assigned workers, risk alerts, documents, incidents, notes, and audit evidence." />
      <Section><ClientProfiles /></Section>
    </>
  );
}
