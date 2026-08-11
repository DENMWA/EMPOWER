import { AdminGate } from "@/components/admin/AdminGate";
import { DocumentIntelligencePanel } from "@/components/documents/DocumentIntelligencePanel";
import { DocumentUploadCard } from "@/components/documents/DocumentUploadCard";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function AdminDocumentsPage() {
  return (
    <AdminGate permission="documents">
      <PageHeader eyebrow="Admin workspace" title="Document Vault" description="Review client documents, staff uploads, access and expiry status." actions={<StatusBadge label="Duty controlled" tone="green" />} />
      <Section><DocumentUploadCard /></Section>
      <Section className="grid gap-6 lg:grid-cols-2"><DocumentVault reviewMode /><DocumentIntelligencePanel /></Section>
    </AdminGate>
  );
}
