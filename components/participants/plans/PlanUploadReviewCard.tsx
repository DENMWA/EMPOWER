"use client";

import { useState } from "react";
import { CheckCircle2, FileUp, ShieldCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { samplePlanExtractions } from "@/lib/plan-progress/sample-data";
import { FeatureGate } from "@/components/subscription/FeatureGate";

export function PlanUploadReviewCard() {
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("Ready for upload");
  const [message, setMessage] = useState("");
  const [parsed, setParsed] = useState(false);

  function selectFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setParsed(false);
    setMessage("");
    setStatus("Ready to parse");
  }

  function parsePlanForReview() {
    if (!fileName) {
      setStatus("Choose a file first");
      setMessage("Choose a PDF or DOCX plan before parsing.");
      return;
    }

    setParsed(true);
    setStatus("Ready for authorised review");
    setMessage(`${fileName} was parsed into review-ready plan evidence. Review each item before accepting it as a baseline.`);
  }

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Plan upload</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Private participant plan intake</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Plans are uploaded against a specific participant, parsed by AI, then held for authorised human verification before goals or baselines are created.</p>
        </div>
        <StatusBadge label={status} tone={fileName ? "amber" : "blue"} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Upload plan document
          <span className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink hover:border-teal-400">
            <FileUp size={17} aria-hidden="true" />
            {fileName || "Choose PDF or DOCX"}
            <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} />
          </span>
        </label>
        <button type="button" onClick={parsePlanForReview} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift">
          <ShieldCheck size={17} aria-hidden="true" />
          Parse plan for review
        </button>
      </div>
      {message ? (
        <p className={`mt-4 rounded-md px-3 py-2 text-sm font-semibold ${parsed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-900"}`}>
          {message}
        </p>
      ) : null}
      {parsed ? (
        <div className="mt-5 rounded-md border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Parsed evidence</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">Review before creating baseline</h3>
            </div>
            <StatusBadge label={`${samplePlanExtractions.length} items found`} tone="green" />
          </div>
          <div className="mt-4 grid gap-3">
            {samplePlanExtractions.map((item) => (
              <div key={item.id} className="rounded-md border border-emerald-100 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <StatusBadge label={`${Math.round(item.confidenceScore * 100)}% confidence`} tone="blue" />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.interpretedText}</p>
                <p className="mt-2 text-xs text-slate-500">Source: page {item.sourcePage}, {item.sourceSection}.</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setStatus("Baseline verification queued")} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift">
            <CheckCircle2 size={17} aria-hidden="true" />
            Queue baseline verification
          </button>
        </div>
      ) : null}
      <FeatureGate entitlement="multiDocumentParsing">
        <p className="mt-4 rounded-md bg-sky-50 p-3 text-sm leading-6 text-sky-900">Multi-document plan intelligence is enabled on this tier. Imported documents still enter the same review queue.</p>
      </FeatureGate>
    </Card>
  );
}
