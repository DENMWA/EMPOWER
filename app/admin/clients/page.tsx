import { AdminGate } from "@/components/admin/AdminGate";
import { HouseManagementCard } from "@/components/admin/HouseManagementCard";
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
        <HouseManagementCard />
      </Section>
      <Section>
        <ClientProfiles admin />
      </Section>
    </AdminGate>
  );
}
