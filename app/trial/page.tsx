import { TrialRunChecklist } from "@/components/trial/TrialRunChecklist";
import { PageHeader, Section } from "@/components/ui";

export default function TrialPage() {
  return (
    <>
      <PageHeader
        eyebrow="Trial run"
        title="Test EmpowerNotes end to end"
        description="A guided provider-day checklist for checking admin setup, worker notes, incidents, reporting, documents, billing, and developer oversight."
      />
      <Section>
        <TrialRunChecklist />
      </Section>
    </>
  );
}
