import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileCheck2, Mic2, ShieldCheck, Sparkles } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { Section } from "@/components/ui";
import { progressNoteFaqs, publicProductProfile } from "@/lib/ai-discoverability";

export const metadata: Metadata = {
  title: "AI Progress Notes for Australian Disability Support",
  description: "Create clear, objective and person-centred disability support progress notes from typed or voice input while keeping workers in control of the facts.",
  alternates: { canonical: "/ai-progress-notes" },
  openGraph: { title: "AI Progress Notes | EmpowerNotes", description: "Clear support records from typed or voice notes, with human review and fact-preserving assistance.", url: "/ai-progress-notes", type: "website" }
};

const workflow = [
  { title: "Capture", detail: "Type a rough note or record a voice account of the support delivered.", icon: Mic2 },
  { title: "Refine", detail: "Empower AI improves clarity, structure and person-centred wording without adding undocumented facts.", icon: Sparkles },
  { title: "Review", detail: "The worker checks the wording, resolves missing details and chooses the final record.", icon: FileCheck2 },
  { title: "Submit", detail: "The selected version becomes the progress note available to authorised reviewers.", icon: CheckCircle2 }
] as const;

export default function AiProgressNotesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "SoftwareApplication", name: "EmpowerNotes AI-assisted progress notes", applicationCategory: "BusinessApplication", operatingSystem: "Web", inLanguage: "en-AU", audience: { "@type": "Audience", audienceType: "Australian disability support providers" }, description: metadata.description, url: `${publicProductProfile.url}/ai-progress-notes` },
      { "@type": "FAQPage", mainEntity: progressNoteFaqs.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: publicProductProfile.url }, { "@type": "ListItem", position: 2, name: "AI progress notes", item: `${publicProductProfile.url}/ai-progress-notes` }] }
    ]
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="text-sm font-semibold text-teal-800">AI-assisted progress notes</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight text-ink sm:text-5xl">Clear records. Original facts. Human control.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Turn typed or voice notes into objective, person-centred support records while keeping the worker responsible for every submitted detail.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink px-5 text-sm font-semibold text-white hover:bg-teal-950">Start free trial <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/features" className="inline-flex min-h-11 items-center rounded-sm border border-slate-300 bg-white px-5 text-sm font-semibold text-ink hover:border-teal-400">Explore the platform</Link>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-sea">A controlled workflow</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">From rough account to reviewed record</h2>
            <p className="mt-4 leading-7 text-slate-600">The assistance sits inside the writing workflow. It does not independently submit notes, decide what happened or replace manager review.</p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              return <li key={item.title} className="border-l-4 border-teal-600 bg-white px-5 py-4 shadow-soft"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-mint text-teal-900"><Icon size={18} aria-hidden="true" /></span><p className="font-bold text-ink">{index + 1}. {item.title}</p></div><p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p></li>;
            })}
          </ol>
        </div>
      </Section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <GuidanceList title="What the AI can help with" icon="check" items={["Objective and professional wording", "Person-centred language", "Clear sequence and readable structure", "Prompts for details that may need confirmation", "Two worker-selectable wording options"]} />
          <GuidanceList title="What remains human" icon="shield" items={["Accuracy of events and support delivered", "Safeguarding and escalation decisions", "Clinical or professional judgement", "Final wording and submission", "Manager approval and organisational compliance"]} />
        </div>
      </section>

      <Section>
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-sea">Designed for real support work</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">Typed, voice and review workflows stay connected</h2>
          <div className="mt-6 grid gap-6 leading-7 text-slate-600 md:grid-cols-2">
            <p>Workers can begin with natural language rather than writing for a template. Voice transcription remains editable, and only the version selected for submission becomes the visible progress-note record.</p>
            <p>Advisory quality feedback highlights a small number of useful improvements without blocking draft saves. Detailed review information remains available to authorised managers and audit workflows.</p>
          </div>
        </div>
      </Section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-ink">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {progressNoteFaqs.map((item) => <details key={item.question} className="py-4"><summary className="cursor-pointer font-semibold text-ink">{item.question}</summary><p className="mt-3 max-w-3xl leading-7 text-slate-600">{item.answer}</p></details>)}
          </div>
        </div>
      </section>
    </>
  );
}

function GuidanceList({ title, icon, items }: { title: string; icon: "check" | "shield"; items: string[] }) {
  const Icon = icon === "check" ? CheckCircle2 : ShieldCheck;
  return <div><h2 className="text-3xl font-bold text-ink">{title}</h2><ul className="mt-5 space-y-3 text-slate-700">{items.map((item) => <li key={item} className="flex gap-3"><Icon size={19} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" /><span>{item}</span></li>)}</ul></div>;
}
