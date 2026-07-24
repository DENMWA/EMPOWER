import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderLock,
  LineChart,
  Mic2,
  ShieldCheck,
  Users
} from "lucide-react";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export const metadata: Metadata = {
  title: "EmpowerNotes Features",
  description: "Preview EmpowerNotes progress notes, incident reporting, client records, documents and reporting.",
  alternates: { canonical: "/features" }
};

const featureSections = [
  {
    id: "progress-notes",
    eyebrow: "Progress notes",
    title: "Turn rough shift notes into clear records",
    detail: "Workers can type or dictate what happened, review two professional rewrites and keep the final record grounded in their original facts.",
    icon: Mic2,
    preview: "note"
  },
  {
    id: "incident-reports",
    eyebrow: "Incident reporting",
    title: "Capture the right detail without slowing the response",
    detail: "Incident-specific templates support injury markers, property damage, immediate actions, notifications and manager follow-up.",
    icon: AlertTriangle,
    preview: "incident"
  },
  {
    id: "client-records",
    eyebrow: "Clients and documents",
    title: "Keep each client’s information in the right place",
    detail: "Profiles, houses, agreements, medicals, CHAP documents and allied health reports stay organised by client and authorised staff access.",
    icon: FolderLock,
    preview: "clients"
  },
  {
    id: "reporting",
    eyebrow: "Reporting intelligence",
    title: "See evidence, progress and operational risk",
    detail: "Managers can review note quality, incidents, goal evidence, service patterns and reporting periods from one controlled workspace.",
    icon: LineChart,
    preview: "report"
  }
] as const;

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Static product preview"
        title="See how EmpowerNotes works"
        description="Explore the key workflows without opening client records or entering the live application."
        actions={<Link href="/signup" className="inline-flex min-h-11 items-center justify-center rounded-sm border border-teal-700 bg-white px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50">Start free trial</Link>}
      />
      <Section className="space-y-10">
        {featureSections.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <section id={feature.id} key={feature.id} className="scroll-mt-36 border-b border-slate-200 pb-10 last:border-0">
              <div className={`grid gap-7 lg:grid-cols-2 lg:items-center ${index % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <div>
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-50 text-teal-800">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-teal-700">{feature.eyebrow}</p>
                  <h2 className="mt-2 text-3xl font-bold leading-tight text-ink">{feature.title}</h2>
                  <p className="mt-4 max-w-xl leading-7 text-slate-600">{feature.detail}</p>
                  <Link href="/signup" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900">
                    Create your workspace <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
                <StaticPreview type={feature.preview} />
              </div>
            </section>
          );
        })}
      </Section>
    </>
  );
}

function StaticPreview({ type }: { type: "note" | "incident" | "clients" | "report" }) {
  if (type === "note") {
    return (
      <PreviewFrame title="Progress note">
        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewField label="House / service" value="Supported accommodation" />
          <PreviewField label="Client" value="Demo Client" />
        </div>
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Original shift note</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">Client chose to prepare lunch with staff support and completed most steps independently.</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge label="Objective language" tone="green" />
          <StatusBadge label="Goal link suggested" tone="blue" />
          <StatusBadge label="Human review required" tone="amber" />
        </div>
      </PreviewFrame>
    );
  }

  if (type === "incident") {
    return (
      <PreviewFrame title="Incident report">
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="Personal injury" tone="red" />
          <StatusBadge label="Property damage" tone="slate" />
          <StatusBadge label="Missing person" tone="slate" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
          <div className="grid min-h-40 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
            <Users size={55} strokeWidth={1.2} aria-hidden="true" />
          </div>
          <div className="space-y-3">
            <PreviewField label="Immediate action" value="Safety checked and manager notified" />
            <PreviewField label="Follow-up" value="Manager review required" />
          </div>
        </div>
      </PreviewFrame>
    );
  }

  if (type === "clients") {
    return (
      <PreviewFrame title="Client workspace">
        <div className="flex items-center gap-3 rounded-md border border-slate-200 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-sky-50 text-sky-800"><Users size={20} aria-hidden="true" /></span>
          <div>
            <p className="font-semibold text-ink">Demo Client</p>
            <p className="text-sm text-slate-500">Supported accommodation · Blue reporting profile</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {["Service agreement", "Health summary", "CHAP", "Allied health report"].map((document) => (
            <div key={document} className="flex items-center gap-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              <FileText size={17} className="text-teal-700" aria-hidden="true" /> {document}
            </div>
          ))}
        </div>
      </PreviewFrame>
    );
  }

  return (
    <PreviewFrame title="Reporting overview">
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Note quality" value="86%" />
        <Metric label="Actions closed" value="14" />
        <Metric label="Goal evidence" value="72%" />
      </div>
      <div className="mt-5 flex h-36 items-end gap-3 border-b border-l border-slate-200 px-4 pb-0">
        {[38, 52, 44, 69, 61, 82].map((height, index) => (
          <span key={index} className="flex-1 rounded-t-sm bg-teal-600/80" style={{ height: `${height}%` }} />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <CheckCircle2 size={17} aria-hidden="true" /> Evidence trend improving
      </div>
    </PreviewFrame>
  );
}

function PreviewFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><ShieldCheck size={15} className="text-teal-700" aria-hidden="true" /> Static preview</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 bg-white p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-ink">{value}</p></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-ink">{value}</p></div>;
}
