import { ProgressDashboard } from "@/components/participants/progress/ProgressDashboard";
import { PageHeader, Section } from "@/components/ui";

export default function ParticipantProgressPage() {
  return (
    <>
      <PageHeader
        eyebrow="Progress & outcomes"
        title="Plan-to-Progress Intelligence"
        description="Connect verified participant plans, baselines, support notes and progress evidence into a traceable outcome record."
      />
      <Section><ProgressDashboard /></Section>
    </>
  );
}
