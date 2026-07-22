import { AdminGate } from "@/components/admin/AdminGate";
import { IncidentReviewQueue } from "@/components/admin/IncidentReviewQueue";
import { IncidentReportCollectionExport } from "@/components/incidents/IncidentReportCollectionExport";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export default function AdminIncidentsPage() {
  return (
    <AdminGate>
      <PageHeader
        eyebrow="Incident review"
        title="Manager incident responses"
        description="Admin-only review queue for submitted incidents. Add manager responses, set review status, and save the response back to the worker-visible incident record."
        actions={<StatusBadge label="Admin / manager only" tone="amber" />}
      />
      <Section>
        <IncidentReviewQueue />
      </Section>
      <Section>
        <IncidentReportCollectionExport />
      </Section>
    </AdminGate>
  );
}
