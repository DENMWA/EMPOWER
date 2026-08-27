"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText, RefreshCw, Sparkles } from "lucide-react";
import { ButtonLink, Card, StatusBadge } from "@/components/ui";

type CheckType = "progress-note" | "incident-report" | "audit-readiness" | "billing-evidence";
type Signal = { id: string; label: string; detail: string; terms: string[]; weight: number };

const checkTypes: Array<{ id: CheckType; label: string; description: string }> = [
  { id: "progress-note", label: "Progress note", description: "Check whether a shift note has clear facts, support actions and outcomes." },
  { id: "incident-report", label: "Incident report", description: "Check whether an incident record captures what happened, response and follow-up." },
  { id: "audit-readiness", label: "Audit readiness", description: "Check whether records show enough evidence for review preparation." },
  { id: "billing-evidence", label: "Billing evidence", description: "Check whether service details support clean invoicing review." }
];

const signals: Record<CheckType, Signal[]> = {
  "progress-note": [
    { id: "who", label: "Client and worker context", detail: "Names, role or shift context are clear enough for review.", terms: ["client", "participant", "worker", "staff", "support"], weight: 14 },
    { id: "when", label: "Date, time or shift period", detail: "The record shows when the support occurred.", terms: ["date", "time", "am", "pm", "shift", "today"], weight: 14 },
    { id: "what", label: "Support provided", detail: "The note explains what support was provided.", terms: ["supported", "assisted", "prompted", "provided", "helped", "transport"], weight: 18 },
    { id: "outcome", label: "Outcome or response", detail: "The note describes the person's response or outcome.", terms: ["outcome", "responded", "completed", "declined", "engaged", "settled"], weight: 18 },
    { id: "risk", label: "Risk, incident or escalation", detail: "Any risks, incidents or need for escalation are named when relevant.", terms: ["risk", "incident", "injury", "concern", "escalated", "reported"], weight: 16 },
    { id: "follow-up", label: "Follow-up needs", detail: "Next steps or review needs are clear.", terms: ["follow up", "next", "review", "monitor", "manager", "handover"], weight: 12 }
  ],
  "incident-report": [
    { id: "event", label: "Incident details", detail: "The report describes what happened in plain sequence.", terms: ["incident", "happened", "occurred", "reported", "observed"], weight: 18 },
    { id: "location", label: "Location and time", detail: "The report includes where and when the incident occurred.", terms: ["location", "house", "community", "date", "time", "shift"], weight: 16 },
    { id: "injury", label: "Injury or property impact", detail: "Injury, body area or property damage is recorded where relevant.", terms: ["injury", "pain", "body", "damage", "property", "vehicle", "house"], weight: 18 },
    { id: "immediate", label: "Immediate response", detail: "Staff actions at the time are documented.", terms: ["first aid", "supported", "assisted", "de-escalated", "called", "notified"], weight: 18 },
    { id: "notifications", label: "Notifications", detail: "Family, manager, emergency services or other notifications are noted.", terms: ["manager", "family", "guardian", "emergency", "police", "ambulance", "notified"], weight: 16 },
    { id: "actions", label: "Follow-up actions", detail: "The report identifies review, prevention or closure actions.", terms: ["follow up", "action", "review", "prevent", "monitor", "closed"], weight: 12 }
  ],
  "audit-readiness": [
    { id: "records", label: "Records are grouped", detail: "The sample references notes, reports, incidents or documents.", terms: ["note", "report", "incident", "document", "record", "evidence"], weight: 18 },
    { id: "dates", label: "Dates are visible", detail: "The evidence has dates, periods or expiry context.", terms: ["date", "period", "weekly", "monthly", "expiry", "review"], weight: 16 },
    { id: "client", label: "Client-specific evidence", detail: "The evidence is tied to the right client or participant.", terms: ["client", "participant", "person", "house", "service"], weight: 16 },
    { id: "approval", label: "Review or approval", detail: "The sample shows manager review, approval or follow-up.", terms: ["review", "approved", "manager", "audit", "quality", "follow up"], weight: 18 },
    { id: "risk", label: "Risk and incident visibility", detail: "Risk, safeguarding or incident themes are visible.", terms: ["risk", "safeguarding", "incident", "behaviour", "injury", "concern"], weight: 16 },
    { id: "export", label: "Export readiness", detail: "The sample can be turned into a clear report or evidence pack.", terms: ["export", "download", "pack", "summary", "invoice", "evidence"], weight: 12 }
  ],
  "billing-evidence": [
    { id: "client", label: "Client and service", detail: "The record identifies the client and support delivered.", terms: ["client", "participant", "support", "service", "delivered"], weight: 18 },
    { id: "dates", label: "Service dates", detail: "Dates or billing period are clear.", terms: ["date", "period", "from", "to", "weekly", "fortnight"], weight: 16 },
    { id: "duration", label: "Duration or quantity", detail: "Hours, kilometres, quantity or units are included.", terms: ["hour", "hours", "km", "kilometre", "quantity", "unit"], weight: 18 },
    { id: "rate", label: "Rate or support item", detail: "The record includes rate, support item or billing category context.", terms: ["rate", "support item", "ndis", "code", "invoice", "billing"], weight: 18 },
    { id: "evidence", label: "Evidence link", detail: "The billing item can be traced back to service evidence.", terms: ["note", "roster", "shift", "evidence", "approved", "completed"], weight: 16 },
    { id: "exceptions", label: "Exceptions are visible", detail: "Cancellations, travel or non-standard items are clearly identified where relevant.", terms: ["cancel", "travel", "non face", "exception", "manual", "agreement"], weight: 12 }
  ]
};

const checklistItems = [
  "Client or participant is clearly identified",
  "Dates, times or service period are clear",
  "Staff action is objective and specific",
  "Outcome, response or follow-up is documented",
  "Risk, incident or escalation pathway is visible",
  "Record could be reviewed by a manager without guessing"
];

const sampleText = "Example: Staff supported the participant during community access. The participant attended the appointment, required verbal prompts with transport, and appeared calm during the activity. No injury or incident was observed. Follow-up with the team leader is required to confirm next appointment details.";

export function DocumentationHealthCheck() {
  const [type, setType] = useState<CheckType>("progress-note");
  const [text, setText] = useState(sampleText);
  const [checked, setChecked] = useState<string[]>(["Client or participant is clearly identified"]);
  const result = useMemo(() => scoreDocumentation(type, text, checked), [type, text, checked]);

  function toggleChecklist(item: string) {
    setChecked((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  }

  function downloadReport() {
    const lines = [
      "EmpowerNotes NDIS Documentation Health Check",
      `Score: ${result.score}%`,
      `Readiness: ${result.band}`,
      `Check type: ${checkTypes.find((item) => item.id === type)?.label}`,
      "",
      "Strengths",
      ...result.strengths.map((item) => `- ${item.label}: ${item.detail}`),
      "",
      "Review areas",
      ...result.gaps.map((item) => `- ${item.label}: ${item.detail}`),
      "",
      "Suggested next steps",
      ...result.nextSteps.map((item) => `- ${item}`),
      "",
      "Important boundary",
      "This is a general documentation readiness check. It is not legal, clinical, safeguarding, audit or NDIS compliance advice."
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "empowernotes-documentation-health-check.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="space-y-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-700">Free health check</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Check a sample record</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Paste a de-identified sample. Do not include real client names, addresses, Medicare details or private health information.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {checkTypes.map((item) => (
            <button key={item.id} type="button" onClick={() => setType(item.id)} aria-pressed={type === item.id} className={`rounded-md border p-4 text-left transition focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${type === item.id ? "border-teal-500 bg-teal-50 ring-1 ring-teal-200" : "border-slate-200 bg-white hover:border-teal-300"}`}>
              <span className="font-bold text-ink">{item.label}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">{item.description}</span>
            </button>
          ))}
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          De-identified sample
          <textarea value={text} onChange={(event) => setText(event.target.value)} className="mt-2 min-h-56 w-full rounded-md border border-slate-300 bg-white p-4 text-sm leading-6 text-ink shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100" placeholder="Paste a sample note, incident summary, evidence summary or billing record here." />
        </label>
        <div>
          <p className="text-sm font-semibold text-slate-700">Quick evidence checklist</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {checklistItems.map((item) => (
              <label key={item} className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-5 text-slate-700">
                <input type="checkbox" checked={checked.includes(item)} onChange={() => toggleChecklist(item)} className="mt-0.5 h-4 w-4 accent-teal-700" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-700">Readiness score</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-6xl font-bold text-ink">{result.score}%</span>
              <StatusBadge label={result.band} tone={result.tone} />
            </div>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-md bg-mint text-teal-900"><Sparkles size={22} aria-hidden="true" /></span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${result.bar}`} style={{ width: `${result.score}%` }} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={17} aria-hidden="true" />Strengths</div>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-emerald-900">{result.strengths.length ? result.strengths.slice(0, 4).map((item) => <li key={item.id}>- {item.label}</li>) : <li>- Add more detail to show clear documentation strengths.</li>}</ul>
          </div>
          <div className="rounded-md border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-center gap-2 font-bold text-amber-900"><AlertTriangle size={17} aria-hidden="true" />Review areas</div>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-amber-950">{result.gaps.slice(0, 4).map((item) => <li key={item.id}>- {item.label}</li>)}</ul>
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 font-bold text-ink"><FileText size={17} aria-hidden="true" />Suggested next steps</div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">{result.nextSteps.map((item) => <li key={item}>- {item}</li>)}</ul>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={downloadReport} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink shadow-sm hover:border-teal-400"><Download size={16} aria-hidden="true" />Download result</button>
          <button type="button" onClick={() => { setText(sampleText); setChecked(["Client or participant is clearly identified"]); }} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink shadow-sm hover:border-teal-400"><RefreshCw size={16} aria-hidden="true" />Reset sample</button>
          <ButtonLink href="/signup">Turn this into a workflow</ButtonLink>
        </div>
        <p className="rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">This health check is general guidance only. It does not replace professional judgement, safeguarding decisions, legal advice, clinical advice or formal NDIS compliance review.</p>
      </Card>
    </div>
  );
}

function scoreDocumentation(type: CheckType, text: string, checked: string[]) {
  const lowerText = text.toLowerCase();
  const activeSignals = signals[type];
  const strengths = activeSignals.filter((signal) => signal.terms.some((term) => lowerText.includes(term)));
  const gaps = activeSignals.filter((signal) => !strengths.includes(signal));
  const textScore = strengths.reduce((total, signal) => total + signal.weight, 0);
  const checklistScore = Math.round((checked.length / checklistItems.length) * 20);
  const lengthScore = text.trim().length > 700 ? 10 : text.trim().length > 320 ? 7 : text.trim().length > 120 ? 4 : 0;
  const score = Math.min(98, Math.max(12, textScore + checklistScore + lengthScore));
  const band = score >= 82 ? "Strong" : score >= 62 ? "Improving" : score >= 42 ? "Needs review" : "High risk";
  const tone: "green" | "blue" | "amber" | "red" = score >= 82 ? "green" : score >= 62 ? "blue" : score >= 42 ? "amber" : "red";
  const bar = score >= 82 ? "bg-emerald-500" : score >= 62 ? "bg-sky-500" : score >= 42 ? "bg-amber-500" : "bg-red-500";
  const nextSteps = buildNextSteps(gaps, type);
  return { score, band, tone, bar, strengths, gaps: gaps.length ? gaps : activeSignals.slice(0, 2), nextSteps };
}

function buildNextSteps(gaps: Signal[], type: CheckType) {
  const firstGaps = gaps.slice(0, 3).map((gap) => `Strengthen ${gap.label.toLowerCase()}: ${gap.detail}`);
  const workflowStep = {
    "progress-note": "Use an EmpowerNotes progress note workflow to capture the original note, AI rewrite options, worker approval and manager review.",
    "incident-report": "Use the incident workflow to capture incident type, body map or property damage details, immediate response and manager follow-up.",
    "audit-readiness": "Use admin reporting and audit packs to bring reviewed notes, incidents, documents and expiry reminders into one view.",
    "billing-evidence": "Use evidence-linked invoicing to connect delivered services, dates, support items and reviewed rates before invoice download."
  }[type];
  return [...firstGaps, workflowStep].slice(0, 4);
}
