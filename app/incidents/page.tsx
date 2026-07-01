import { IncidentAssistant } from "@/components/incidents/IncidentAssistant";
import { IncidentReportCollectionExport } from "@/components/incidents/IncidentReportCollectionExport";
import { PageHeader, Section } from "@/components/ui";

export default function IncidentsPage() {
  return (
    <>
      <PageHeader title="Incident Report Assistant" description="Capture what happened, immediate actions, notifications, follow-up, and manager review prompts without making final legal or compliance decisions." />
      <Section><IncidentAssistant /></Section>
      <Section><IncidentReportCollectionExport /></Section>
    </>
  );
}
