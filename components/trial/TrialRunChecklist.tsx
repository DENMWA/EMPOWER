"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, ExternalLink, RotateCcw } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getTrialRunCompletedSteps, saveTrialRunCompletedSteps } from "@/lib/trial-run";
import { cn } from "@/lib/utils";

type TrialStep = {
  id: string;
  area: string;
  title: string;
  detail: string;
  href: string;
};

const trialSteps: TrialStep[] = [
  { id: "admin-login", area: "Admin", title: "Choose Demo or Real Mode", detail: "Use Demo Mode for buyer walkthroughs, or Real Mode for clean testing with only entered records.", href: "/admin/settings" },
  { id: "trial-plan", area: "Onboarding", title: "Choose the trial plan", detail: "Confirm the plan tier and trial setup before adding operational records.", href: "/signup" },
  { id: "add-client", area: "Admin", title: "Add a client profile", detail: "Add one client with goals, risks, assigned staff, and a reporting colour.", href: "/admin/clients/new" },
  { id: "add-staff", area: "Admin", title: "Add a staff member", detail: "Create one worker or manager and save their participant access.", href: "/admin/staff/new" },
  { id: "progress-note", area: "Notes", title: "Create the first progress note", detail: "Write a rough note, use AI rewrite, choose the best version, and save it.", href: "/notes/new" },
  { id: "upload-document", area: "Documents", title: "Upload a client document", detail: "Save one document to the correct client with start, expiry, and reminder dates.", href: "/documents" },
  { id: "incident-report", area: "Incidents", title: "Complete an incident report", detail: "Record the event, body map markers, property damage if relevant, and manager review.", href: "/incidents/new" },
  { id: "admin-reports", area: "Reports", title: "Download a branded report", detail: "Export a manager-ready progress, incident, document, or billing report by period.", href: "/admin/reports" }
];

export function TrialRunChecklist() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCompleted(getTrialRunCompletedSteps());
  }, []);

  useEffect(() => {
    saveTrialRunCompletedSteps(completed);
  }, [completed]);

  const completedCount = useMemo(() => trialSteps.filter((step) => completed[step.id]).length, [completed]);
  const progress = Math.round((completedCount / trialSteps.length) * 100);

  function toggleStep(stepId: string) {
    setCompleted((current) => ({ ...current, [stepId]: !current[stepId] }));
  }

  function resetTrial() {
    setCompleted({});
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-200 bg-teal-50/70">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Trial command centre</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Your first EmpowerNotes trial run</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
              Follow this short path to prove the app works from setup through note writing, document storage, incident reporting, and branded exports.
            </p>
          </div>
          <StatusBadge label={`${completedCount}/${trialSteps.length} complete`} tone={completedCount === trialSteps.length ? "green" : "blue"} />
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-sea transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AccessCard label="Admin password" value="EmpowerNotes2026" />
          <button type="button" onClick={resetTrial} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400">
            <RotateCcw size={17} aria-hidden="true" />
            Reset trial ticks
          </button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {trialSteps.map((step) => {
          const isDone = Boolean(completed[step.id]);
          return (
            <Card key={step.id} className={cn("transition", isDone ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200")}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleStep(step.id)}
                  className={cn(
                    "mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-md border text-sm font-bold",
                    isDone ? "border-emerald-500 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-500"
                  )}
                  aria-pressed={isDone}
                  aria-label={`Mark ${step.title} as ${isDone ? "not complete" : "complete"}`}
                >
                  {isDone ? <CheckCircle2 size={18} aria-hidden="true" /> : null}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={step.area} tone={isDone ? "green" : "blue"} />
                    <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
                  <Link href={step.href} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white hover:bg-slate-800">
                    Open step
                    <ExternalLink size={16} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-sky-50 text-sky-800">
            <ClipboardCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-ink">What to record during trial</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Note anything that feels confusing, too slow, too many clicks, missing from a real shift, or unclear for audit. Those notes become the next product refinement list.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AccessCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-teal-100 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
