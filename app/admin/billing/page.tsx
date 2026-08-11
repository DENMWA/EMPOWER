import { AdminGate } from "@/components/admin/AdminGate";
import { NativeBillingWorkspace } from "@/components/billing/NativeBillingWorkspace";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function AdminBillingPage() {
  return (
    <AdminGate permission="billing">
      <PageHeader
        eyebrow="Finance"
        title="Invoicing"
        description="Agreements, delivered supports and participant invoices."
        actions={<StatusBadge label="NDIS ready" tone="green" />}
      />
      <Section>
        <NativeBillingWorkspace />
      </Section>
    </AdminGate>
  );
}
