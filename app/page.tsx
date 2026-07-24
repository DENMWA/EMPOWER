import Link from "next/link";
import { ButtonLink, Section, StatusBadge } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, FileText, FolderLock, LineChart, Mic2, ShieldCheck, Smartphone, Sparkles, Users, type LucideIcon } from "lucide-react";

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
  { name: "Solo", detail: "Independent providers", price: "A$49.99", href: "/signup", cue: "Start lean" },
  { name: "Practice", detail: "Small support teams", price: "A$129.99", href: "/signup", cue: "Most popular", featured: true },
  { name: "Provider", detail: "Growing organisations", price: "A$299.99", href: "/contact", cue: "Scale teams" },
  { name: "Enterprise", detail: "Multi-site governance", price: "A$799.99", href: "/contact", cue: "Governance ready" }
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
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_440px] lg:items-center">
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
              <StatusBadge label="Private by design" tone="green" />
              <StatusBadge label="No card during early testing" tone="green" />
              <StatusBadge label="Human review stays required" tone="blue" />
              <StatusBadge label="Data export stays available" tone="slate" />
            </div>
          </div>

          <MobileAppPreview />
        </div>
      </section>

      <Section>
        <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-soft md:grid-cols-3">
          {["Private by design.", "Your team. Your clients. Your workspace.", "Workers see only what they need."].map((line) => (
            <p key={line} className="text-lg font-bold text-ink">{line}</p>
          ))}
        </div>
      </Section>

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
          {plans.map((plan) => (
            <Link
              key={plan.name}
              href={plan.href}
              className={`group relative min-h-44 overflow-hidden rounded-md border bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${plan.featured ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200 hover:border-teal-300"}`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-700 via-sky-600 to-amber-500 opacity-0 transition group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{plan.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{plan.detail}</p>
                </div>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${plan.featured ? "bg-mint text-teal-900" : "bg-slate-100 text-slate-700"}`}>
                  {plan.featured ? <Sparkles size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}
                </span>
              </div>
              <div className="mt-5">
                <p className="text-2xl font-bold text-sea">{plan.price}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">per month</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${plan.featured ? "bg-teal-50 text-teal-800" : "bg-slate-50 text-slate-700"}`}>{plan.cue}</span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800">
                  View plan
                  <ArrowRight size={15} className="transition group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </Link>
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

function MobileAppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[390px]">
      <div className="absolute -left-5 top-10 hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-lift sm:flex sm:items-center sm:gap-2">
        <Smartphone size={16} className="text-teal-700" aria-hidden="true" />
        Works on mobile
      </div>
      <div className="rounded-[2rem] border border-slate-900 bg-slate-950 p-3 shadow-lift">
        <div className="overflow-hidden rounded-[1.55rem] bg-slate-100">
          <div className="flex items-center justify-center bg-slate-950 py-2">
            <span className="h-1.5 w-20 rounded-full bg-slate-700" />
          </div>
          <div className="bg-white px-4 pb-5 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-ink text-sm font-bold text-white">E</span>
                <div>
                  <p className="text-sm font-bold text-ink">EmpowerNotes</p>
                  <p className="text-xs text-slate-500">Mobile shift note</p>
                </div>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Saved</span>
            </div>

            <div className="mt-4 rounded-md border border-teal-100 bg-teal-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-900">Today</p>
              <p className="mt-1 text-lg font-bold text-ink">Community access</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Client record, goals, risk alerts, and staff actions in one place.</p>
            </div>

            <div className="mt-3 grid gap-2">
              {heroRecords.map((record) => {
                const Icon = record.icon;
                return (
                  <div key={record.title} className="flex gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-teal-800 shadow-sm">
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{record.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-600">{record.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-md bg-ink p-3 text-white">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">AI rewrite ready</p>
                <Mic2 size={16} aria-hidden="true" />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-200">Choose a professional version, then save the note to the client record.</p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm leading-6 text-slate-600">
        Staff can write, dictate, and review records from a phone during everyday support work.
      </p>
    </div>
  );
}
