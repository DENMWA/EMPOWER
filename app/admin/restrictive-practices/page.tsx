import { AdminGate } from "@/components/admin/AdminGate";
import { RestrictivePracticeWorkspace } from "@/components/admin/RestrictivePracticeWorkspace";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function RestrictivePracticesPage() {
  return <AdminGate permission="restrictive_practice_reporting">
    <PageHeader eyebrow="Behaviour support" title="Restrictive Practice Reporting" description="Manage authorisations, record use, and prepare monthly reporting." actions={<StatusBadge label="Restricted access" tone="amber" />} />
    <Section><RestrictivePracticeWorkspace /></Section>
  </AdminGate>;
}
