import { AdminGate } from "@/components/admin/AdminGate";
import { ProgressDashboard } from "@/components/participants/progress/ProgressDashboard";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function AdminProgressPage() {
  return (
    <AdminGate>
      <PageHeader
        eyebrow="Admin progress intelligence"
        title="Plan-to-Progress Intelligence"
        description="Admin-only view connecting verified plans, baselines, support notes, incidents, and progress evidence into a traceable outcome record."
        actions={<StatusBadge label="Admin / owner only" tone="blue" />}
      />
      <Section><ProgressDashboard /></Section>
    </AdminGate>
  );
}
