import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { ButtonLink, PageHeader, Section, StatusBadge } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import type { PublicLandingPage as PublicLandingPageData } from "@/lib/public-landing-pages";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.empowernotes.org";

type PublicLandingPageProps = {
  page: PublicLandingPageData;
};

export function getPublicLandingPageMetadata(page: PublicLandingPageData) {
  return {
    title: page.metaTitle,
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: `${page.metaTitle} | EmpowerNotes`,
      description: page.description,
      url: `/${page.slug}`,
      type: "website",
      locale: "en_AU"
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.metaTitle} | EmpowerNotes`,
      description: page.description
    }
  };
}

export function PublicLandingPage({ page }: PublicLandingPageProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: `EmpowerNotes ${page.title}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "en-AU",
        areaServed: { "@type": "Country", name: "Australia" },
        description: page.description,
        url: `${appUrl}/${page.slug}`,
        isPartOf: { "@id": `${appUrl}/#website` }
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer }
        }))
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
          { "@type": "ListItem", position: 2, name: page.title, item: `${appUrl}/${page.slug}` }
        ]
      }
    ]
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHeader
        eyebrow={page.eyebrow}
        title={page.h1}
        description={page.intro}
        actions={<ButtonLink href="/signup">Start free trial</ButtonLink>}
      />

      <Section className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="space-y-5">
            {page.sections.map((section) => (
              <section key={section.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-teal-50 text-teal-800">
                    <CheckCircle2 size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-ink">{section.title}</h2>
                    <p className="mt-2 leading-7 text-slate-600">{section.body}</p>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-teal-800">
                <ShieldCheck size={17} aria-hidden="true" />
                Trust signals
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {page.proofPoints.map((point) => <StatusBadge key={point} label={point} tone="green" />)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-teal-800">
                <Search size={17} aria-hidden="true" />
                Search intent
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {page.searchIntents.map((intent) => <StatusBadge key={intent} label={intent} tone="blue" />)}
              </div>
            </div>
          </aside>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-700">Common questions</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {page.faqs.map((faq) => (
              <div key={faq.question} className="rounded-md bg-slate-50 p-4">
                <h2 className="font-bold text-ink">{faq.question}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-teal-200 bg-teal-50 p-5">
          <div>
            <p className="font-bold text-ink">See the product workflow</p>
            <p className="mt-1 text-sm text-slate-600">Explore the EmpowerNotes feature area connected to this page.</p>
          </div>
          <Link href={page.primaryFeatureUrl} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white">
            View feature <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </Section>
    </>
  );
}
