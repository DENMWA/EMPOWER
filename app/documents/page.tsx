import { DocumentIntelligencePanel } from "@/components/documents/DocumentIntelligencePanel";
import { DocumentUploadCard } from "@/components/documents/DocumentUploadCard";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { PageHeader, Section } from "@/components/ui";

export default function DocumentsPage() {
  return (
    <>
      <PageHeader title="Document Vault and AI Evidence Reader" description="Upload support documents to a specific client, track start and expiry dates, show one-month and fortnight expiry reminders, and require manager verification before extracted information is treated as authoritative." />
      <Section><DocumentUploadCard /></Section>
      <Section className="grid gap-6 lg:grid-cols-2"><DocumentVault /><DocumentIntelligencePanel /></Section>
    </>
  );
}
