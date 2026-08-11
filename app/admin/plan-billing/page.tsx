import { AdminGate } from "@/components/admin/AdminGate";
import { SubscriptionWorkspace } from "@/components/billing/SubscriptionWorkspace";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function PlanBillingPage() {
  return <AdminGate permission="settings">
    <PageHeader eyebrow="Workspace" title="Plan & billing" description="Your EmpowerNotes subscription at a glance." actions={<StatusBadge label="Owner controls" tone="blue" />} />
    <Section><SubscriptionWorkspace /></Section>
  </AdminGate>;
}
