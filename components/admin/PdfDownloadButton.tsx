"use client";

import { Download } from "lucide-react";
import { downloadOrganisationReportHtml } from "@/lib/organisation-profile";
import { cn } from "@/lib/utils";

type PdfDownloadButtonProps = {
  filename: string;
  title: string;
  lines: string[];
  variant?: "primary" | "secondary";
};

export function PdfDownloadButton({ filename, title, lines, variant = "secondary" }: PdfDownloadButtonProps) {
  function download() {
    downloadOrganisationReportHtml(filename, title, lines.join("\n"));
  }

  return (
    <button
      type="button"
      onClick={download}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold focus:outline focus:outline-2 focus:outline-teal-700",
        variant === "primary" ? "bg-sea text-white shadow-lift hover:bg-teal-800" : "border border-slate-300 bg-white text-ink hover:border-teal-400 hover:bg-slate-50"
      )}
    >
      <Download size={17} aria-hidden="true" />
      Download report
    </button>
  );
}
