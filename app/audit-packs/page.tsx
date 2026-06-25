import { AuditPackGenerator } from "@/components/audit/AuditPackGenerator";
import { InvoiceSummaryCard } from "@/components/invoicing/InvoiceSummaryCard";
import { PageHeader, Section } from "@/components/ui";

export default function AuditPacksPage() {
  return (
    <>
      <PageHeader title="Audit Pack Generator" description="Generate participant/client evidence packs covering notes, goals, incidents, approval trails, documents, invoice-readiness, and PDF export placeholders." />
      <Section className="grid gap-6 lg:grid-cols-2"><AuditPackGenerator /><InvoiceSummaryCard /></Section>
    </>
  );
}
