import { ParticipantProfile } from "@/components/participants/ParticipantProfile";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { PageHeader, Section } from "@/components/ui";
import { participants } from "@/lib/sample-data";

export default function ParticipantsPage() {
  return (
    <>
      <PageHeader title="Participant and Client Profiles" description="Profiles connect support needs, goals, assigned workers, risk alerts, documents, incidents, notes, and audit evidence." />
      <Section className="grid gap-6 lg:grid-cols-2">
        {participants.map((participant) => <ParticipantProfile key={participant.id} participant={participant} />)}
      </Section>
      <Section><DocumentVault /></Section>
    </>
  );
}
