import Link from "next/link";
import { ButtonLink, Section } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderLock,
  Mic2,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  type LucideIcon
} from "lucide-react";
import { plans as pricingPlans } from "@/lib/pricing-data";

const workflows: Array<{ title: string; detail: string; icon: LucideIcon; href: string }> = [
  {
    title: "Document support",
    detail: "Write or dictate clear, professional notes.",
    icon: Mic2,
    href: "/ai-progress-notes"
  },
  {
    title: "Manage clients",
    detail: "Keep profiles, incidents and documents together.",
    icon: Users,
    href: "/features#client-records"
  },
  {
    title: "Roster teams",
    detail: "Coordinate houses, services and staff shifts.",
    icon: CalendarDays,
    href: "/features"
  },
  {
    title: "Invoice services",
    detail: "Turn completed support into checked invoices.",
    icon: ReceiptText,
    href: "/features"
  }
];

const heroRecords: Array<{ title: string; detail: string; icon: LucideIcon }> = [
  { title: "Progress note", detail: "Professional wording, ready to review.", icon: FileText },
  { title: "Incident report", detail: "Details, actions and follow-up.", icon: AlertTriangle },
  { title: "Client documents", detail: "Plans, agreements and reminders.", icon: FolderLock }
];

const planDetails: Record<string, { detail: string; cue: string }> = {
  solo: { detail: "Independent providers", cue: "Start lean" },
  practice: { detail: "Small support teams", cue: "Most popular" },
  provider: { detail: "Growing organisations", cue: "Scale teams" },
  enterprise: { detail: "Multi-site governance", cue: "Tailored" }
};

const plans = pricingPlans.map((plan) => ({
  ...plan,
  detail: planDetails[plan.tier].detail,
  cue: planDetails[plan.tier].cue,
  featured: plan.highlighted
}));

export default function HomePage() {
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "EmpowerNotes",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "en-AU",
    areaServed: { "@type": "Country", name: "Australia" },
    audience: { "@type": "Audience", audienceType: "Australian disability support providers" },
    description: "Support documentation, client records, rostering and billing for Australian disability support providers.",
    offers: { "@type": "Offer", category: "Subscription" }
  };

  return (
    <>
      <JsonLd data={softwareJsonLd} />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_420px] lg:items-center lg:px-8">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-md bg-mint px-3 py-1 text-sm font-semibold text-teal-900">
              <ShieldCheck size={16} aria-hidden="true" />
              Australian disability support software
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-6xl">
              Care delivered. Clearly recorded.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Notes, incidents, rosters and invoices. One workspace.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/signup">Start free trial</ButtonLink>
              <ButtonLink href="/contact" variant="secondary">Book a demo</ButtonLink>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-600">
              {["14 days free", "No card required", "Works on mobile"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-700" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <MobileAppPreview />
        </div>
      </section>

      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflows.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group min-h-48 rounded-md border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-lift focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700"
              >
                <span className="grid h-11 w-11 place-items-center rounded-md bg-mint text-teal-900">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-lg font-bold text-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-800">
                  Open <ArrowRight size={15} className="transition group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section>
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
          <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
            <div className="border-b border-slate-200 p-6 lg:border-b-0 lg:border-r lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-sea">One connected view</p>
              <h2 className="mt-2 text-3xl font-bold text-ink">The day stays organised.</h2>
              <ButtonLink href="/features" variant="secondary">
                <span className="inline-flex items-center gap-2">See the platform <ArrowRight size={16} aria-hidden="true" /></span>
              </ButtonLink>
            </div>
            <ProductPreview />
          </div>
        </div>
      </Section>

      <Section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Plans</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Start at the right size.</h2>
          </div>
          <ButtonLink href="/pricing" variant="secondary">Compare plans</ButtonLink>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Link
              key={plan.name}
              href={plan.href}
              className={`group relative min-h-48 overflow-hidden rounded-md border bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${plan.featured ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200 hover:border-teal-300"}`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-700 via-sky-600 to-amber-500 opacity-0 transition group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{plan.shortName}</p>
                  <p className="mt-1 text-sm text-slate-600">{plan.detail}</p>
                </div>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${plan.featured ? "bg-mint text-teal-900" : "bg-slate-100 text-slate-700"}`}>
                  {plan.featured ? <Sparkles size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}
                </span>
              </div>
              <p className="mt-6 text-2xl font-bold text-sea">{plan.price.replace("/month", "")}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{plan.selfService ? "per month" : "Tailored agreement"}</p>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${plan.featured ? "bg-teal-50 text-teal-800" : "bg-slate-50 text-slate-700"}`}>{plan.cue}</span>
                <ArrowRight size={17} className="text-teal-800 transition group-hover:translate-x-1" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-5 rounded-md border border-teal-200 bg-teal-50 p-6 shadow-soft lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
          <div>
            <h2 className="text-3xl font-bold text-ink">Ready when you are.</h2>
          </div>
          <ButtonLink href="/signup">Start free trial</ButtonLink>
        </div>
      </Section>
    </>
  );
}

function MobileAppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[370px]">
      <div className="absolute -left-5 top-10 hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-lift sm:flex sm:items-center sm:gap-2">
        <Smartphone size={16} className="text-teal-700" aria-hidden="true" />
        Mobile ready
      </div>
      <div className="rounded-[2rem] border border-slate-900 bg-slate-950 p-3 shadow-lift">
        <div className="overflow-hidden rounded-[1.55rem] bg-white">
          <div className="flex items-center justify-center bg-slate-950 py-2">
            <span className="h-1.5 w-20 rounded-full bg-slate-700" />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-ink text-sm font-bold text-white">E</span>
                <div><p className="text-sm font-bold text-ink">EmpowerNotes</p><p className="text-xs text-slate-500">Community access</p></div>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Saved</span>
            </div>
            <div className="mt-4 grid gap-2">
              <div className="rounded-md border border-teal-100 bg-teal-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-900">Today</p>
                <p className="mt-1 text-base font-bold text-ink">Community access</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Client record, goals and staff actions in one place.</p>
              </div>
              {heroRecords.map((record) => {
                const Icon = record.icon;
                return (
                  <div key={record.title} className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-teal-800 shadow-sm"><Icon size={15} aria-hidden="true" /></span>
                    <div><p className="text-sm font-semibold text-ink">{record.title}</p><p className="mt-0.5 text-xs leading-5 text-slate-600">{record.detail}</p></div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md bg-ink p-3 text-white">
              <div><p className="text-sm font-semibold">Note ready</p><p className="mt-1 text-xs text-slate-300">Review and save</p></div>
              <Mic2 size={17} aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductPreview() {
  const rows = [
    { label: "Morning shift", detail: "2 staff · 3 clients", tone: "bg-sky-50 text-sky-800", icon: CalendarDays },
    { label: "Notes awaiting review", detail: "4 records", tone: "bg-amber-50 text-amber-800", icon: FileText },
    { label: "Ready to invoice", detail: "A$2,840", tone: "bg-emerald-50 text-emerald-800", icon: ReceiptText }
  ];

  return (
    <div className="bg-slate-50 p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div><p className="font-bold text-ink">Today</p><p className="text-sm text-slate-500">Operations overview</p></div>
        <span className="rounded-md bg-white px-3 py-2 text-xs font-bold text-teal-800 shadow-sm">All services</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="min-h-36 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <span className={`grid h-9 w-9 place-items-center rounded-md ${row.tone}`}><Icon size={17} aria-hidden="true" /></span>
              <p className="mt-4 text-sm font-bold text-ink">{row.label}</p>
              <p className="mt-1 text-sm text-slate-600">{row.detail}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
        {["Role-controlled access", "Human-reviewed AI", "Exportable records"].map((item) => (
          <span key={item} className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-2"><CheckCircle2 size={14} className="text-teal-700" aria-hidden="true" />{item}</span>
        ))}
      </div>
    </div>
  );
}
