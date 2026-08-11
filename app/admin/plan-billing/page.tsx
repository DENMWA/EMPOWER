import { AdminGate } from "@/components/admin/AdminGate";
import { SubscriptionWorkspace } from "@/components/billing/SubscriptionWorkspace";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function PlanBillingPage() {
  return <AdminGate permission="settings">
    <PageHeader eyebrow="Workspace" title="Plan & billing" description="Review your current plan, usage and available options." actions={<StatusBadge label="Owner controls" tone="green" />} />
    <Section><SubscriptionWorkspace /></Section>
  </AdminGate>;
}
