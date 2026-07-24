import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Scale } from "lucide-react";
import { PageHeader, Section } from "@/components/ui";
import { getLegalPolicy, legalPolicies, policyContactEmail, policyEffectiveDate } from "@/lib/legal-policies";

export function generateStaticParams() {
  return legalPolicies.map((policy) => ({ slug: policy.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const policy = getLegalPolicy(params.slug);
  if (!policy) return {};
  return {
    title: policy.title,
    description: policy.summary,
    alternates: { canonical: `/legal/${policy.slug}` }
  };
}

export default function PolicyPage({ params }: { params: { slug: string } }) {
  const policy = getLegalPolicy(params.slug);
  if (!policy) notFound();

  return (
    <>
      <PageHeader eyebrow="EmpowerNotes policy" title={policy.title} description={policy.summary} />
      <Section>
        <article className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5 text-sm text-slate-600">
            <span>Effective {policyEffectiveDate}</span>
            <span>{policy.audience}</span>
          </div>
          <div className="space-y-8 pt-7">
            {policy.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-bold text-ink">{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 leading-7 text-slate-700">{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 space-y-2 pl-5 text-slate-700">
                    {section.bullets.map((bullet) => <li key={bullet} className="list-disc leading-7">{bullet}</li>)}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
          <div className="mt-9 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <Scale size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>Draft for Australian legal review before production use. Policy enquiries: {policyContactEmail}</p>
          </div>
          <Link href="/legal" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900">
            <ArrowLeft size={16} aria-hidden="true" /> Back to policy centre
          </Link>
        </article>
      </Section>
    </>
  );
}
