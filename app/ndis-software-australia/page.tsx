import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, FileCheck2, FolderLock, ReceiptText, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink, PageHeader, Section, StatusBadge } from "@/components/ui";
import { ndisOperationsPage, publicSeoPages } from "@/lib/public-seo-pages";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.empowernotes.org";

export const metadata: Metadata = {
  title: ndisOperationsPage.metaTitle,
  description: ndisOperationsPage.description,
  alternates: { canonical: "/ndis-software-australia" },
  openGraph: {
    title: `${ndisOperationsPage.metaTitle} | EmpowerNotes`,
    description: ndisOperationsPage.description,
    url: "/ndis-software-australia",
    type: "website",
    locale: "en_AU"
  },
  twitter: {
    card: "summary_large_image",
    title: `${ndisOperationsPage.metaTitle} | EmpowerNotes`,
    description: ndisOperationsPage.description
  }
};

const operatingAreas = [
  { title: "Progress notes", detail: "Typed, voice and structured support records.", href: "/features/progress-notes", icon: ClipboardList },
  { title: "Incident reporting", detail: "Client-specific incidents, injury markers and manager response.", href: "/features/incident-reporting", icon: ShieldCheck },
  { title: "Rostering", detail: "Client, house and staff scheduling with availability context.", href: "/features/rostering", icon: CalendarDays },
  { title: "Client records", detail: "Profiles, documents, agreements, appointments and reminders.", href: "/features/client-records", icon: FolderLock },
  { title: "Billing", detail: "Delivered services, reviewed rates and participant invoices.", href: "/features/billing", icon: ReceiptText },
  { title: "Audit reporting", detail: "Reports, evidence trends and admin-only audit packs.", href: "/features/audit-reporting", icon: FileCheck2 }
];

export default function NdisSoftwareAustraliaPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "EmpowerNotes",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "en-AU",
        areaServed: { "@type": "Country", name: "Australia" },
        audience: { "@type": "Audience", audienceType: "Australian NDIS and disability support providers" },
        description: ndisOperationsPage.description,
        url: `${appUrl}/ndis-software-australia`,
        isPartOf: { "@id": `${appUrl}/#website` }
      },
      {
        "@type": "ItemList",
        name: "EmpowerNotes NDIS operations capabilities",
        itemListElement: operatingAreas.map((area, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: area.title,
          description: area.detail,
          url: `${appUrl}${area.href}`
        }))
      }
    ]
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHeader
        eyebrow="NDIS software Australia"
        title="One operations workspace for Australian disability providers"
        description="EmpowerNotes brings support documentation, incidents, rostering, client records, appointments, documents and invoicing into one practical system."
        actions={<ButtonLink href="/signup">Start free trial</ButtonLink>}
      />

      <Section className="space-y-8">
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-800">Searches this page is designed to answer</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ndisOperationsPage.searchIntents.map((intent) => <StatusBadge key={intent} label={intent} tone="blue" />)}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {operatingAreas.map((area) => {
            const Icon = area.icon;
            return (
              <Link key={area.title} href={area.href} className="group min-h-48 rounded-lg border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-lift">
                <span className="grid h-11 w-11 place-items-center rounded-md bg-mint text-teal-900"><Icon size={20} aria-hidden="true" /></span>
                <h2 className="mt-5 text-xl font-bold text-ink">{area.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{area.detail}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-800">Learn more <ArrowRight size={15} className="transition group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            );
          })}
        </div>

        <section className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-soft lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-700">Why this positioning matters</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">More than a note taker</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>Many providers search for one problem at a time: progress notes, incident reports, staff rosters, service agreements, appointment reminders or NDIS invoices.</p>
            <p>EmpowerNotes should be discovered across all of those searches because the product is now an operational system. Each workflow stays connected to the client, house or service, staff access and manager review.</p>
            <p>The public pages describe the product clearly while private workspaces, client records and staff data remain outside search indexing.</p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-700">Explore by workflow</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {publicSeoPages.map((page) => (
              <Link key={page.slug} href={`/features/${page.slug}`} className="flex min-h-16 items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 hover:border-teal-300 hover:bg-teal-50/40">
                <div>
                  <p className="font-semibold text-ink">{page.metaTitle}</p>
                  <p className="mt-1 text-sm text-slate-600">{page.description}</p>
                </div>
                <ArrowRight size={17} className="shrink-0 text-teal-700" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </Section>
    </>
  );
}
