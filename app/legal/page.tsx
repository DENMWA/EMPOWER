import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader, Section } from "@/components/ui";
import { legalPolicies } from "@/lib/legal-policies";

export const metadata: Metadata = {
  title: "Legal and Policy Centre",
  description: "EmpowerNotes privacy, terms, security, AI, data processing and service policies.",
  alternates: { canonical: "/legal" }
};

export default function LegalPage() {
  return (
    <>
      <PageHeader
        eyebrow="Trust centre"
        title="Legal and policy centre"
        description="Clear information about privacy, security, responsible AI and use of EmpowerNotes."
      />
      <Section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {legalPolicies.map((policy) => (
            <Link key={policy.slug} href={`/legal/${policy.slug}`} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-soft hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lift">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">{policy.audience}</p>
              <h2 className="mt-3 text-xl font-bold text-ink">{policy.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{policy.summary}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
                Read policy <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
