import { IncidentReportForm } from "@/components/incidents/IncidentReportForm";
import { PageHeader, Section } from "@/components/ui";

export default function NewIncidentReportPage() {
  return (
    <>
      <PageHeader
        title="New Incident Report"
        description="Choose the incident type first, then complete a specific template for injury, property damage, absconding, behaviour, medication, medical, safeguarding, near miss, or other incidents."
      />
      <Section><IncidentReportForm /></Section>
    </>
  );
}
