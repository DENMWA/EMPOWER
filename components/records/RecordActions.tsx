"use client";

import { useState } from "react";
import { Download, Save } from "lucide-react";
import { printOrganisationReportPdf } from "@/lib/organisation-profile";
import { saveTenantRetainedRecord } from "@/lib/retained-records";
import { cn } from "@/lib/utils";

type RecordActionsProps = {
  recordId: string;
  recordType: string;
  title: string;
  body: string;
  filename: string;
  className?: string;
  allowDownload?: boolean;
  actionLabel?: string;
  saveRelatedRecord?: () => Promise<{ savedToCloud: boolean; error: string; bodyAppend?: string }>;
};

export function RecordActions({ recordId, recordType, title, body, filename, className, allowDownload = true, actionLabel = "Save record", saveRelatedRecord }: RecordActionsProps) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [message, setMessage] = useState("");

  async function saveRecord() {
    setSaveState("saving");
    setMessage("Saving to this organisation...");
    const relatedResult = saveRelatedRecord ? await saveRelatedRecord() : { savedToCloud: true, error: "", bodyAppend: "" };
    if (!relatedResult.savedToCloud) {
      setSaveState("failed");
      setMessage(`Cloud save failed. A recovery draft remains on this device. ${relatedResult.error || "Try again."}`);
      return;
    }
    const record = {
      id: recordId,
      type: recordType,
      title,
      body: `${body}${relatedResult.bodyAppend || ""}`,
      savedAt: new Date().toISOString()
    };
    const result = await saveTenantRetainedRecord(record);
    const savedToCloud = result.savedToCloud;
    setSaveState(savedToCloud ? "saved" : "failed");
    setMessage(savedToCloud
      ? "Saved to this organisation."
      : `Cloud save failed. A recovery draft remains on this device. ${relatedResult.error || result.error || "Try again."}`);
    if (savedToCloud) window.dispatchEvent(new Event("empowernotes:retained-records-updated"));
  }

  function downloadRecord() {
    printOrganisationReportPdf(filename, title, `${body}\n\nExported: ${new Date().toLocaleString("en-AU")}`);
  }

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <button type="button" onClick={saveRecord} disabled={saveState === "saving"} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
        <Save size={17} aria-hidden="true" />
        {saveState === "saving" ? (actionLabel === "Submit" ? "Submitting..." : "Saving...") : saveState === "saved" ? (actionLabel === "Submit" ? "Submitted" : "Saved") : saveState === "failed" ? (actionLabel === "Submit" ? "Retry submit" : "Retry save") : actionLabel}
      </button>
      {allowDownload ? (
        <button type="button" onClick={downloadRecord} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400">
          <Download size={17} aria-hidden="true" />
          Print / save PDF
        </button>
      ) : null}
      {message ? <p aria-live="polite" className={cn("basis-full rounded-md px-3 py-2 text-sm font-semibold", saveState === "failed" ? "bg-red-50 text-red-700" : saveState === "saving" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700")}>{message}</p> : null}
    </div>
  );
}
