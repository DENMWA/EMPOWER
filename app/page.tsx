import { ButtonLink, Section, StatusBadge } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { AlertTriangle, Building2, CheckCircle2, FileText, FolderLock, LineChart, Mic2, ShieldCheck, Users, type LucideIcon } from "lucide-react";

const outcomes = [
  {
    title: "Progress notes",
    detail: "Turn rough notes and voice input into professional, person-centred support records.",
    icon: Mic2
  },
  {
    title: "Incident reports",
    detail: "Capture what happened, actions taken, injury markers, property damage, notifications, and follow-up.",
    icon: AlertTriangle
  },
  {
    title: "Client records and documents",
    detail: "Keep client profiles, plans, agreements, medicals, CHAP, and allied health reports organised.",
    icon: FolderLock
  },
  {
    title: "Progress evidence",
    detail: "Link plans, baselines, notes, incidents, and documents into manager-ready progress reporting.",
    icon: LineChart
  }
];

const heroRecords: Array<{ title: string; detail: string; icon: LucideIcon }> = [
  {
    title: "Progress note",
    detail: "Rephrased, goal link suggested, missing detail flagged.",
    icon: FileText
  },
  {
    title: "Incident report",
    detail: "Injury map, property damage, notifications, follow-up.",
    icon: AlertTriangle
  },
  {
    title: "Document review",
    detail: "NDIS plan expiry reminder and evidence queue.",
    icon: FolderLock
  }
];

const audiences = [
  "Independent providers",
  "Small practices",
  "Growing providers",
  "Multi-site organisations"
];

const steps = [
  "Add clients",
  "Write or dictate notes",
  "Upload documents",
  "Review reports"
];

const plans = [
  ["Solo", "Independent providers"],
  ["Practice", "Small support teams"],
  ["Provider", "Growing organisations"],
  ["Enterprise", "Multi-site governance"]
];

export default function HomePage() {
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "EmpowerNotes",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "en-AU",
    areaServed: {
      "@type": "Country",
      name: "Australia"
    },
    audience: [
      {
        "@type": "Audience",
        audienceType: "NDIS providers"
      },
      {
        "@type": "Audience",
        audienceType: "Disability support providers"
      },
      {
        "@type": "Audience",
        audienceType: "Social workers and youth workers"
      }
    ],
    description:
      "Australian documentation software for audit-ready progress notes, incident reports, client records, document evidence, and provider reporting.",
    offers: {
      "@type": "Offer",
      category: "Subscription"
    }
  };

  return (
    <>
      <JsonLd data={softwareJsonLd} />
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-md bg-mint px-3 py-1 text-sm font-semibold text-teal-900">
              <ShieldCheck size={16} aria-hidden="true" />
              Australian support documentation software
            </p>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-ink sm:text-6xl">
              Audit-ready support documentation, without the paperwork drag.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              EmpowerNotes helps Australian disability and community service providers create professional progress notes, incident reports, client records, document evidence, and plan-to-progress reports.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/signup">Start 14-day trial</ButtonLink>
              <ButtonLink href="/contact" variant="secondary">Book demo</ButtonLink>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              <StatusBadge label="No card during early testing" tone="green" />
              <StatusBadge label="Human review stays required" tone="blue" />
              <StatusBadge label="Data export stays available" tone="slate" />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-950 p-4 shadow-lift">
            <div className="rounded-md bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-sea">Today&apos;s records</p>
                  <h2 className="mt-1 text-2xl font-bold text-ink">Ready for review</h2>
                </div>
                <StatusBadge label="Manager view" tone="blue" />
              </div>
              <div className="mt-5 grid gap-3">
                {heroRecords.map((record) => {
                  const Icon = record.icon;
                  return (
                  <div key={record.title} className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink text-white">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold text-ink">{record.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{record.detail}</p>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {outcomes.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
                <span className="grid h-11 w-11 place-items-center rounded-md bg-mint text-teal-900">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Built for</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">From solo providers to multi-site organisations.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Start with the plan that matches your service today, then add team oversight, standardised workflows, reporting, and governance as you grow.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {audiences.map((audience) => (
            <div key={audience} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-sky-50 text-sky-800">
                {audience.includes("organisation") ? <Building2 size={18} aria-hidden="true" /> : <Users size={18} aria-hidden="true" />}
              </span>
              <p className="font-semibold text-ink">{audience}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sea">How it works</p>
              <h2 className="mt-2 text-3xl font-bold text-ink">Simple enough for daily use.</h2>
            </div>
            <ButtonLink href="/signup" variant="secondary">Set up workspace</ButtonLink>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="rounded-md bg-slate-50 p-4">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-sm font-bold text-white">{index + 1}</span>
                <p className="mt-3 font-semibold text-ink">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Plans</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Choose the level of oversight you need.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Solo, Practice, Provider, and Enterprise give each service a clear path from better documentation to governance and organisation-wide intelligence.
            </p>
          </div>
          <ButtonLink href="/pricing" variant="secondary">See pricing</ButtonLink>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {plans.map(([name, detail]) => (
            <div key={name} className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
              <p className="font-bold text-ink">{name}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="rounded-md border border-teal-200 bg-teal-50 p-6 shadow-soft">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-900">Start testing</p>
              <h2 className="mt-2 text-3xl font-bold text-ink">From rough support notes to professional records, reports, and evidence.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
                Start a 14-day trial, add a client, create a note, upload a document, and download a report before your first demo conversation.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <ButtonLink href="/signup">Start 14-day trial</ButtonLink>
              <ButtonLink href="/contact" variant="secondary">Book demo</ButtonLink>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Human verification", "Source traceability", "Record history", "Data export"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-teal-900">
                <CheckCircle2 size={16} aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
