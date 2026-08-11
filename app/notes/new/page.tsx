import { ProgressNoteGenerator } from "@/components/notes/ProgressNoteGenerator";
import { ProgressNoteLog } from "@/components/notes/ProgressNoteLog";
import { SelfCertificationPanel } from "@/components/certification/SelfCertificationPanel";
import { TemplatesPanel } from "@/components/templates/TemplatesPanel";
import { PageHeader, Section } from "@/components/ui";

export default function NewNotePage() {
  return (
    <>
      <PageHeader title="Progress Note Studio" description="Turn rough or voice notes into clear, objective, person-centred records, without changing the facts." />
      <Section><ProgressNoteGenerator /></Section>
      <Section><ProgressNoteLog /></Section>
      <Section className="grid gap-6 lg:grid-cols-2"><SelfCertificationPanel /><TemplatesPanel /></Section>
    </>
  );
}
