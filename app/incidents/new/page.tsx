import { IncidentReportForm } from "@/components/incidents/IncidentReportForm";
import { PageHeader, Section } from "@/components/ui";

export default function NewIncidentReportPage() {
  return (
    <>
      <PageHeader
        title="New Incident Report"
        description="Create a structured, audit-friendly incident report with injury details, body map markers, manager review prompts, attachments, and sign-off controls."
      />
      <Section><IncidentReportForm /></Section>
    </>
  );
}
