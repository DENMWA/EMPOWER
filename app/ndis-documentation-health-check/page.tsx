import type { Metadata } from "next";
import { ClipboardCheck, ShieldCheck, Sparkles } from "lucide-react";
import { DocumentationHealthCheck } from "@/components/marketing/DocumentationHealthCheck";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink, PageHeader, Section, StatusBadge } from "@/components/ui";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.empowernotes.org";

export const metadata: Metadata = {
  title: "Free NDIS Documentation Health Check",
  description: "Check how audit-ready a de-identified NDIS progress note, incident report, evidence summary or billing record may be, then see practical improvement areas.",
  alternates: { canonical: "/ndis-documentation-health-check" },
  openGraph: {
    title: "Free NDIS Documentation Health Check | EmpowerNotes",
    description: "Check sample NDIS documentation for clarity, evidence signals, risk gaps and review readiness.",
    url: "/ndis-documentation-health-check",
    type: "website",
    locale: "en_AU"
  },
  twitter: {
    card: "summary_large_image",
    title: "Free NDIS Documentation Health Check | EmpowerNotes",
    description: "Check sample NDIS documentation for clarity, evidence signals, risk gaps and review readiness."
  }
};

export default function NdisDocumentationHealthCheckPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "EmpowerNotes NDIS Documentation Health Check",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "en-AU",
        areaServed: { "@type": "Country", name: "Australia" },
        description: metadata.description,
        url: `${appUrl}/ndis-documentation-health-check`,
        isPartOf: { "@id": `${appUrl}/#website` }
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Is the NDIS Documentation Health Check compliance advice?",
            acceptedAnswer: { "@type": "Answer", text: "No. It provides general documentation guidance only and does not replace professional judgement, legal advice, clinical advice, safeguarding decisions or formal NDIS compliance review." }
          },
          {
            "@type": "Question",
            name: "Should real client details be pasted into the public health check?",
            acceptedAnswer: { "@type": "Answer", text: "No. The public health check is intended for de-identified examples only." }
          }
        ]
      }
    ]
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHeader
        eyebrow="Free NDIS documentation health check"
        title="Check how audit-ready your support records look"
        description="Paste a de-identified sample note, incident summary, evidence record or billing item. Get a practical score, review gaps and next steps in under a minute."
        actions={<ButtonLink href="/signup">Start free trial</ButtonLink>}
      />

      <Section className="space-y-7">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Useful before signup", detail: "Providers can see the problem before they trial the full workspace.", icon: Sparkles },
            { label: "Built for NDIS workflows", detail: "The score checks notes, incidents, audit evidence and billing readiness.", icon: ClipboardCheck },
            { label: "Private-safe by design", detail: "The public checker asks for de-identified samples only.", icon: ShieldCheck }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-mint text-teal-900"><Icon size={18} aria-hidden="true" /></span>
                <h2 className="mt-4 text-lg font-bold text-ink">{item.label}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-800">Popular searches this answers</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["NDIS documentation health check", "NDIS audit readiness check", "NDIS progress note quality", "NDIS incident report checklist", "NDIS evidence checklist"].map((item) => <StatusBadge key={item} label={item} tone="blue" />)}
          </div>
        </div>

        <DocumentationHealthCheck />
      </Section>
    </>
  );
}
