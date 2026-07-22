import { AdminGate } from "@/components/admin/AdminGate";
import { ClientProfiles } from "@/components/participants/ClientProfiles";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function AdminClientsPage() {
  return (
    <AdminGate>
      <PageHeader
        eyebrow="Client management"
        title="Participant and client profiles"
        description="Admin-only client records for support needs, goals, staff access, risk alerts, documents, incidents, notes, and reporting colours."
        actions={<StatusBadge label="Admin / owner only" tone="blue" />}
      />
      <Section>
        <ClientProfiles admin />
      </Section>
    </AdminGate>
  );
}
