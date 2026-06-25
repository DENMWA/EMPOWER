import { Card, PageHeader, Section } from "@/components/ui";

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Book Demo" description="A placeholder contact page for demos and founding provider conversations." />
      <Section><Card><p className="text-slate-700">Connect this page to your CRM, calendar, or support inbox when production systems are selected.</p></Card></Section>
    </>
  );
}
