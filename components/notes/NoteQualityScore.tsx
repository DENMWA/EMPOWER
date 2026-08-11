import { AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import type { NoteQuality } from "@/lib/ai-mock";

export function NoteQualityScore({ quality }: { quality: NoteQuality }) {
  const status = getQualityStatus(quality.auditReadiness);
  const issues = quality.improvements.slice(0, 3);
  const rows = [
    ["Audit readiness", `${quality.auditReadiness}%`],
    ["Person-centred language", `${quality.personCentredLanguage}/10`],
    ["Objective wording", `${quality.objectiveWording}/10`],
    ["Detail level", `${quality.detailLevel}/10`],
    ["Goal connection", quality.goalConnection],
    ["Follow-up action", quality.followUpAction],
    ["Risk clarity", `${quality.riskClarity}/10`],
    ["Billing evidence", `${quality.billingEvidenceScore}%`]
  ];

  return (
    <aside aria-labelledby="note-quality-title" className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {status.ready ? <CheckCircle2 className="shrink-0 text-emerald-700" size={20} aria-hidden="true" /> : <AlertCircle className="shrink-0 text-amber-700" size={20} aria-hidden="true" />}
          <div className="min-w-0">
            <h2 id="note-quality-title" className="text-sm font-semibold text-ink">Note quality</h2>
            <p className="text-xs text-slate-600">Advisory only. Draft saving is always available.</p>
          </div>
        </div>
        <div className="text-right" aria-label={`Quality score ${quality.auditReadiness} percent, ${status.label}`}>
          <p className="text-lg font-bold text-ink">{quality.auditReadiness}%</p>
          <p className="text-xs font-semibold text-slate-600">{status.label}</p>
        </div>
      </div>

      {issues.length ? (
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700" aria-label="Suggested improvements">
          {issues.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>)}
        </ul>
      ) : <p className="mt-3 text-sm text-slate-700">No immediate quality issues detected.</p>}

      <details className="group mt-3 border-t border-slate-200 pt-3">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-sea focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
          View details
          <ChevronDown className="transition-transform group-open:rotate-180" size={18} aria-hidden="true" />
        </summary>
        <dl className="mt-2 grid gap-x-5 gap-y-2 pb-1 text-sm sm:grid-cols-2">
          {rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2"><dt className="text-slate-600">{label}</dt><dd className="font-semibold text-ink">{value}</dd></div>)}
        </dl>
      </details>
    </aside>
  );
}

function getQualityStatus(score: number) {
  if (score >= 80) return { label: "Ready for review", ready: true };
  if (score >= 60) return { label: "Review suggested", ready: false };
  return { label: "Needs attention", ready: false };
}
