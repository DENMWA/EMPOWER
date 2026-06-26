"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type PdfDownloadButtonProps = {
  filename: string;
  title: string;
  lines: string[];
  variant?: "primary" | "secondary";
};

export function PdfDownloadButton({ filename, title, lines, variant = "secondary" }: PdfDownloadButtonProps) {
  function download() {
    const pdf = buildSimplePdf(title, lines);
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
      Download PDF
    </button>
  );
}

function buildSimplePdf(title: string, lines: string[]) {
  const safeLines = [title, "", ...lines].map((line) => line.replace(/[()\\]/g, ""));
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 780 Td",
    `(${safeLines[0]}) Tj`,
    "/F1 11 Tf",
    ...safeLines.slice(1).flatMap((line) => ["0 -18 Td", `(${line}) Tj`]),
    "ET"
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
}
