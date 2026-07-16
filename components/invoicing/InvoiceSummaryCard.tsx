"use client";

import { useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { getInvoiceSummaryDemo } from "@/lib/invoice-readiness";
import { downloadOrganisationReportHtml } from "@/lib/organisation-profile";

export function InvoiceSummaryCard() {
  const summary = getInvoiceSummaryDemo();
  const [message, setMessage] = useState("");

  function downloadSummary() {
    const lines = Object.entries(summary).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`);
    downloadOrganisationReportHtml("empowernotes-invoice-summary.html", "EmpowerNotes Invoice Summary", lines.join("\n"));
    setMessage("Invoice summary downloaded.");
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Invoice Summary</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {Object.entries(summary).map(([key, value]) => (
          <div key={key} className="rounded-md bg-slate-50 p-3">
            <dt className="font-semibold capitalize text-slate-600">{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd className="mt-1 text-ink">{Array.isArray(value) ? value.join(", ") : value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={downloadSummary} className="rounded-md bg-sea px-4 py-3 text-sm font-semibold text-white">Read invoice summary</button>
        <button type="button" onClick={() => setMessage("Demo invoice marked as sent. Connect accounting software before live sending.")} className="rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold">Mock send invoice</button>
      </div>
      {message ? <p className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">{message}</p> : null}
      <div className="mt-3"><StatusBadge label="No accounting engine connected" tone="blue" /></div>
    </Card>
  );
}
