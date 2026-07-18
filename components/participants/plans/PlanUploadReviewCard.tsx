"use client";

import { useState } from "react";
import { FileUp, ShieldCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { FeatureGate } from "@/components/subscription/FeatureGate";

export function PlanUploadReviewCard() {
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("Waiting for upload");

  function selectFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setStatus("Queued for private upload and AI parsing");
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
        <button type="button" onClick={() => fileName && setStatus("Ready for authorised review")} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift">
          <ShieldCheck size={17} aria-hidden="true" />
          Simulate parsing
        </button>
      </div>
      <FeatureGate entitlement="multiDocumentParsing">
        <p className="mt-4 rounded-md bg-sky-50 p-3 text-sm leading-6 text-sky-900">Multi-document plan intelligence is enabled on this tier. Imported documents still enter the same review queue.</p>
      </FeatureGate>
    </Card>
  );
}
