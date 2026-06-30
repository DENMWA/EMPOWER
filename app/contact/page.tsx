import type { Metadata } from "next";
import { Card, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Book an EmpowerNotes Demo in Australia",
  description:
    "Book an EmpowerNotes demo for Australian NDIS providers, disability support teams, social workers, youth workers, and community service organisations.",
  alternates: {
    canonical: "/contact"
  }
};

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Book Demo" description="Book an Australian provider demo for NDIS documentation, incident reporting, client records, rostering, and billing workflows." />
      <Section><Card><p className="text-slate-700">Connect this page to your CRM, calendar, or support inbox when production systems are selected.</p></Card></Section>
    </>
  );
}
