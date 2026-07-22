import { AdminGate } from "@/components/admin/AdminGate";
import { AuditPackGenerator } from "@/components/audit/AuditPackGenerator";
import { InvoiceSummaryCard } from "@/components/invoicing/InvoiceSummaryCard";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function AdminAuditPacksPage() {
  return (
    <AdminGate>
      <PageHeader
        eyebrow="Audit packs"
        title="Admin audit pack generator"
        description="Admin-only evidence packs covering client notes, goals, incidents, approval trails, documents, invoice-readiness, and branded export placeholders."
        actions={<StatusBadge label="Admin only" tone="amber" />}
      />
      <Section className="grid gap-6 lg:grid-cols-2">
        <AuditPackGenerator />
        <InvoiceSummaryCard />
      </Section>
    </AdminGate>
  );
}
