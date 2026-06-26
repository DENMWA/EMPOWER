"use client";

import { useState } from "react";
import { Download, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type RecordActionsProps = {
  recordId: string;
  recordType: string;
  title: string;
  body: string;
  filename: string;
  className?: string;
};

export function RecordActions({ recordId, recordType, title, body, filename, className }: RecordActionsProps) {
  const [saved, setSaved] = useState(false);

  function saveRecord() {
    const record = {
      id: recordId,
      type: recordType,
      title,
      body,
      savedAt: new Date().toISOString()
    };
    window.localStorage.setItem(`empower-retained-record:${recordId}`, JSON.stringify(record));
    setSaved(true);
  }

  function downloadRecord() {
    const content = `${title}\n\n${body}\n\nExported: ${new Date().toLocaleString("en-AU")}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <button type="button" onClick={saveRecord} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift">
        <Save size={17} aria-hidden="true" />
        {saved ? "Saved locally" : "Save record"}
      </button>
      <button type="button" onClick={downloadRecord} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400">
        <Download size={17} aria-hidden="true" />
        Download
      </button>
    </div>
  );
}
