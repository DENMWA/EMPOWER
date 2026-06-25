import { ProgressNoteGenerator } from "@/components/notes/ProgressNoteGenerator";
import { SelfCertificationPanel } from "@/components/certification/SelfCertificationPanel";
import { TemplatesPanel } from "@/components/templates/TemplatesPanel";
import { PageHeader, Section } from "@/components/ui";

export default function NewNotePage() {
  return (
    <>
      <PageHeader title="Progress Note Generator" description="Turn rough worker notes, dictated text, and guided voice interviews into professional, objective, person-centred progress notes without inventing facts." />
      <Section><ProgressNoteGenerator /></Section>
      <Section className="grid gap-6 lg:grid-cols-2"><SelfCertificationPanel /><TemplatesPanel /></Section>
    </>
  );
}
