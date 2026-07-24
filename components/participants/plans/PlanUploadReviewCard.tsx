"use client";

import { useState } from "react";
import { CheckCircle2, FileUp, ShieldCheck } from "lucide-react";
import { getCurrentSubscriptionTier } from "@/lib/subscriptions/browser-tier";
import { Card, StatusBadge } from "@/components/ui";
import type { PlanExtraction } from "@/lib/plan-progress/types";
import { savePlanVerificationQueue } from "@/lib/plan-progress/verification-records";

export function PlanUploadReviewCard({ participantId, participantName }: { participantId?: string; participantName?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("Ready for upload");
  const [message, setMessage] = useState("");
  const [parsed, setParsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extractions, setExtractions] = useState<PlanExtraction[]>([]);
  const [source, setSource] = useState("");

  function selectFile(file: File | undefined) {
    if (!file) return;
    setFile(file);
    setFileName(file.name);
    setParsed(false);
    setExtractions([]);
    setSource("");
    setMessage("");
    setStatus("Ready to parse");
  }

  async function parsePlanForReview() {
    if (!file) {
      setStatus("Choose a file first");
      setMessage("Choose a PDF or DOCX plan before parsing.");
      return;
    }

    setLoading(true);
    setParsed(false);
    setStatus("Parsing document");
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/plan-progress/parse", {
        method: "POST",
        headers: {
          "x-empowernotes-tier": getCurrentSubscriptionTier()
        },
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus("Parsing failed");
        setMessage(data?.error || "Plan parsing failed. Try a text-based PDF, DOCX, or TXT file.");
        return;
      }

      const items = Array.isArray(data?.items) ? data.items as PlanExtraction[] : [];
      setExtractions(items);
      setSource(typeof data?.source === "string" ? data.source : "");
      setParsed(true);
      setStatus("Ready for authorised review");
      setMessage(`${fileName} was parsed into ${items.length} review-ready item${items.length === 1 ? "" : "s"}. Review each item before accepting it as a baseline.`);
    } catch {
      setStatus("Parsing failed");
      setMessage("Plan parsing could not reach the server. Check deployment logs and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function queueBaselineVerification() {
    if (!extractions.length) {
      setStatus("Nothing to queue");
      setMessage("Parse a plan first, then queue the extracted items for authorised review.");
      return;
    }

    const result = await savePlanVerificationQueue({
      participantId: participantId || "unassigned-client",
      participantName: participantName || "Selected client",
      fileName,
      parserSource: source || "chatgpt",
      items: extractions
    });

    setStatus("Baseline verification queued");
    setMessage(result.savedToCloud ? "Plan extraction items were saved for authorised baseline review." : "Plan extraction items were saved locally. Sign in to retain them in this workspace.");
  }

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Plan upload</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Private participant plan intake</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {participantName ? `Plans uploaded here are held against ${participantName}, parsed with ChatGPT, then held for authorised human verification before goals or baselines are created.` : "Plans are uploaded against a specific participant, parsed with ChatGPT, then held for authorised human verification before goals or baselines are created."}
          </p>
        </div>
        <StatusBadge label={status} tone={fileName ? "amber" : "blue"} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Upload plan document
          <span className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink hover:border-teal-400">
            <FileUp size={17} aria-hidden="true" />
            {fileName || "Choose PDF, DOCX, or TXT"}
            <input type="file" accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} />
          </span>
        </label>
        <button type="button" onClick={parsePlanForReview} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
          <ShieldCheck size={17} aria-hidden="true" />
          {loading ? "Parsing..." : "Parse plan for review"}
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
              {source ? <p className="mt-1 text-sm text-slate-600">Parser source: {source === "chatgpt" ? "ChatGPT powered extraction" : source}</p> : null}
            </div>
            <StatusBadge label={`${extractions.length} items found`} tone="green" />
          </div>
          <div className="mt-4 grid gap-3">
            {extractions.map((item) => (
              <div key={item.id} className="rounded-md border border-emerald-100 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <StatusBadge label={item.extractionType.replace(/_/g, " ")} tone="green" />
                  <StatusBadge label={`${Math.round(item.confidenceScore * 100)}% confidence`} tone="blue" />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.interpretedText}</p>
                <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-600">Original: {item.originalText}</p>
                <p className="mt-2 text-xs text-slate-500">Source: page {item.sourcePage}, {item.sourceSection}.</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={queueBaselineVerification} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift">
            <CheckCircle2 size={17} aria-hidden="true" />
            Queue baseline verification
          </button>
        </div>
      ) : null}
      <p className="mt-4 rounded-md bg-sky-50 p-3 text-sm leading-6 text-sky-900">
        Single-plan parsing is available for testing when the server has a valid OpenAI key. Multi-document batch processing can remain a higher-plan feature later.
      </p>
    </Card>
  );
}
