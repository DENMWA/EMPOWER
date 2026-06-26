import { AddClientForm } from "@/components/admin/AddClientForm";
import { AdminGate } from "@/components/admin/AdminGate";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function AddClientPage() {
  return (
    <AdminGate>
      <PageHeader
        eyebrow="Add client"
        title="Create a client profile"
        description="Add client details, support needs, risk alerts, goals, staff access, and a dedicated reporting colour for admin dashboards."
        actions={<StatusBadge label="Admin / owner only" tone="blue" />}
      />
      <Section>
        <AddClientForm />
      </Section>
    </AdminGate>
  );
}
