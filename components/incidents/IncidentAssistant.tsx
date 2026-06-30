import Link from "next/link";
import { ClipboardList, FilePlus2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui";

export function IncidentAssistant() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
      <Card className="space-y-5">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-ink text-white shadow-lift">
            <ClipboardList size={24} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Incident reporting</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Structured incident capture with manager review</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Capture what happened, who was involved, visible injury or distress, immediate response, notifications, follow-up actions, and review status in one guided workflow.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Body map", "Mark front or back body locations with injury notes."],
            ["Save/download", "Retain a local draft and export the report."],
            ["Review", "Send incidents through a manager review path."]
          ].map(([title, body]) => (
            <div key={title} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
        <Link href="/incidents/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift">
          <FilePlus2 size={18} aria-hidden="true" />
          New incident report
        </Link>
      </Card>
      <Card className="space-y-4 bg-amber-50/70">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-amber-700" size={22} aria-hidden="true" />
          <h2 className="text-xl font-bold text-ink">Manager visibility</h2>
        </div>
        <p className="text-sm leading-6 text-slate-700">
          Reports include prompts for emergency escalation, safeguarding concern, reportable incident assessment, support-plan updates, and lock status. Final decisions remain with the organisation and authorised reviewers.
        </p>
      </Card>
    </div>
  );
}
