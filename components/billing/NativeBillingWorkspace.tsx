"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileDown, ReceiptText, ShieldAlert } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { downloadOrganisationReportHtml } from "@/lib/organisation-profile";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";
import { getTenantStaffInvites, type StaffRecord } from "@/lib/staff-records";
import {
  activatePricingVersion,
  addServiceAgreementItem,
  buildInvoiceCsv,
  completeShift,
  createInvoiceFromShift,
  createPricingVersionFromManualUpload,
  createServiceAgreement,
  createSupportShift,
  getBudgetUsage,
  getNativeBillingRecords,
  markInvoicePaymentStatus,
  nativeBillingUpdatedEvent,
  type NativeBillingRecords,
  type NativeInvoice,
  type NativeInvoiceLine
} from "@/lib/native-billing";

export function NativeBillingWorkspace() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [notes, setNotes] = useState<RetainedRecord[]>([]);
  const [records, setRecords] = useState<NativeBillingRecords>(getNativeBillingRecords());
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [message, setMessage] = useState("");
  const activePricingVersion = records.pricingVersions.find((version) => version.status === "active");
  const draftPricingVersions = records.pricingVersions.filter((version) => version.status === "draft");
  const supportItems = activePricingVersion ? records.supportItems.filter((item) => item.pricingVersionId === activePricingVersion.id) : [];
  const selectedClient = clients.find((client) => client.id === selectedClientId) || clients[0];
  const selectedStaff = staff.find((item) => item.id === selectedStaffId) || staff[0];
  const selectedAgreement = selectedClient ? records.agreements.find((agreement) => agreement.participantId === selectedClient.id && agreement.status === "active") : undefined;
  const budgetRows = selectedClient ? getBudgetUsage(records, selectedClient.id) : [];
  const exceptionLines = records.invoiceLines.filter((line) => line.exceptionReason);

  useEffect(() => {
    function loadRecords() {
      getTenantClients().then((items) => {
        setClients(items);
        if (!selectedClientId && items[0]) setSelectedClientId(items[0].id);
      }).catch(() => setClients([]));
      getTenantStaffInvites().then((items) => {
        setStaff(items);
        if (!selectedStaffId && items[0]) setSelectedStaffId(items[0].id);
      }).catch(() => setStaff([]));
      getTenantRetainedRecords("progress-note").then(setNotes).catch(() => setNotes([]));
      setRecords(getNativeBillingRecords());
    }

    loadRecords();
    window.addEventListener(nativeBillingUpdatedEvent, loadRecords);
    window.addEventListener("empowernotes:retained-records-updated", loadRecords);
    return () => {
      window.removeEventListener(nativeBillingUpdatedEvent, loadRecords);
      window.removeEventListener("empowernotes:retained-records-updated", loadRecords);
    };
  }, [selectedClientId, selectedStaffId]);

  function importPricingVersion() {
    const version = createPricingVersionFromManualUpload({
      versionName: `Manual NDIS pricing ${new Date().toLocaleDateString("en-AU")}`,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      sourceFilename: "manual-ndis-support-catalogue.csv"
    });
    setMessage(`${version.versionName} imported as draft. Review and activate before invoice use.`);
  }

  function activateDraft(versionId: string) {
    activatePricingVersion(versionId);
    setMessage("Pricing version activated. Older active versions are preserved as superseded.");
  }

  function createAgreementAndItem() {
    if (!selectedClient || !activePricingVersion || !supportItems[0]) {
      setMessage("Add a client and activate a pricing version first.");
      return;
    }

    const agreement = createServiceAgreement({
      participant: selectedClient,
      agreementName: `${selectedClient.name} NDIS service agreement`,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      billingFrequency: "fortnightly",
      recipientName: "Plan manager / recipient",
      recipientEmail: ""
    });
    addServiceAgreementItem({
      agreement,
      supportItem: supportItems[0],
      pricingVersion: activePricingVersion,
      agreedRate: supportItems[0].priceLimit || 0,
      budgetAllocated: 5000,
      allowCancellations: true
    });
    setMessage(`Service agreement created for ${selectedClient.name} with selected pricing version.`);
  }

  function scheduleShift() {
    if (!selectedClient || !selectedAgreement) {
      setMessage("Create a service agreement before scheduling a billable shift.");
      return;
    }

    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(11, 0, 0, 0);
    const shift = createSupportShift({
      participant: selectedClient,
      staff: selectedStaff,
      agreement: selectedAgreement,
      title: "Scheduled direct support",
      supportType: "Community access",
      location: "Participant preferred community location",
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });
    setMessage(`${shift.title} scheduled for ${selectedClient.name}.`);
  }

  function completeFirstShift() {
    const shift = records.shifts.find((item) => item.participantId === selectedClient?.id && item.status === "scheduled");
    if (!shift) {
      setMessage("Schedule a shift first.");
      return;
    }
    const matchingNote = notes.find((note) => note.body.includes(selectedClient?.name || "") || note.id.includes(selectedClient?.id || ""));
    completeShift(shift.id, matchingNote?.id || "");
    setMessage(matchingNote ? "Shift completed and linked to a saved progress note." : "Shift completed. Missing-note evidence warning will appear on invoice.");
  }

  function generateInvoice() {
    const shift = records.shifts.find((item) => item.participantId === selectedClient?.id && item.status === "completed");
    if (!shift) {
      setMessage("Complete a shift before generating an invoice draft.");
      return;
    }

    const result = createInvoiceFromShift(shift.id, notes);
    setMessage(result.error || `${result.invoice?.invoiceNumber} created as native EmpowerNotes invoice draft.`);
  }

  function exportInvoice(invoice: NativeInvoice, lines: NativeInvoiceLine[]) {
    const body = [
      `Invoice: ${invoice.invoiceNumber}`,
      `Invoice date: ${invoice.invoiceDate}`,
      `Due date: ${invoice.dueDate}`,
      `Participant: ${invoice.participantName}`,
      `Recipient: ${invoice.recipientName}`,
      `Billing period: ${invoice.billingPeriodStart} to ${invoice.billingPeriodEnd}`,
      "",
      "This invoice uses the selected NDIS Pricing Arrangements and Price Limits version. Confirm the support item, claim type and billing rules before issuing.",
      "",
      ...lines.map((line) => [
        `Service date: ${line.serviceDate}`,
        `Support item: ${line.supportItemNumber} - ${line.supportItemName}`,
        `Description: ${line.description}`,
        `Quantity: ${line.quantity} ${line.unitType}`,
        `Rate: $${line.rate}`,
        `Amount: $${line.amount}`,
        `Pricing version: ${line.pricingVersionName}`,
        `Evidence linked: ${line.evidenceStatus === "evidence_linked" || line.evidenceStatus === "approved" ? "Yes" : "No"}`,
        `Support note reference: ${line.noteReference}`,
        `Shift reference: ${line.shiftId}`,
        `Price check: ${line.priceCheckStatus}`
      ].join("\n")),
      "",
      `Total: $${invoice.totalAmount}`,
      `Payment status: ${invoice.paymentStatus}`
    ].join("\n\n");
    downloadOrganisationReportHtml(`${invoice.invoiceNumber}.html`, "EmpowerNotes Native Invoice", body);
    downloadCsv(`${invoice.invoiceNumber}.csv`, buildInvoiceCsv(invoice, lines));
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Scheduling and native invoicing</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Evidence-backed NDIS billing workflow</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">Schedule supports, connect service agreements, activate reviewed pricing versions, generate native EmpowerNotes invoice drafts, and export PDF/CSV without Xero.</p>
          </div>
          <StatusBadge label="No Xero dependency" tone="green" />
        </div>
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">This invoice uses the selected NDIS Pricing Arrangements and Price Limits version. Confirm the support item, claim type and billing rules before issuing.</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Client
          <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={selectedClient?.id || ""} onChange={(event) => setSelectedClientId(event.target.value)}>
            {!clients.length ? <option>Add a client first</option> : null}
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Staff
          <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={selectedStaff?.id || ""} onChange={(event) => setSelectedStaffId(event.target.value)}>
            {!staff.length ? <option>Add staff first</option> : null}
            {staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <StatusPanel records={records} exceptionCount={exceptionLines.length} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold text-ink">1. NDIS pricing version</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Manual pricing upload creates a draft version. Admin must activate it before invoice generation uses it.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={importPricingVersion} className="rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white">Import manual pricing draft</button>
            {draftPricingVersions.map((version) => <button key={version.id} type="button" onClick={() => activateDraft(version.id)} className="rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold">Activate {version.versionName}</button>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {records.pricingVersions.map((version) => <StatusBadge key={version.id} label={`${version.versionName} - ${version.status}`} tone={version.status === "active" ? "green" : version.status === "draft" ? "amber" : "blue"} />)}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-ink">2. Service agreement</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Create an active agreement, recipient profile, support item, agreed rate, and budget allocation.</p>
          <button type="button" onClick={createAgreementAndItem} className="mt-4 rounded-md bg-sea px-4 py-3 text-sm font-semibold text-white">Create service agreement and item</button>
          <div className="mt-4 space-y-2">
            {records.agreements.map((agreement) => <p key={agreement.id} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{agreement.participantName} - {agreement.billingFrequency} - {agreement.status}</p>)}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-ink">3. Schedule and complete shift</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Completed shifts can be linked to progress notes before invoicing. Missing notes are flagged but not silently blocked.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={scheduleShift} className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white"><CalendarDays size={17} /> Schedule shift</button>
            <button type="button" onClick={completeFirstShift} className="rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold">Complete next shift</button>
          </div>
          <div className="mt-4 space-y-2">
            {records.shifts.map((shift) => <p key={shift.id} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{shift.participantName} - {shift.supportType} - {shift.status} - note: {shift.noteRecordId || "missing"}</p>)}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-ink">4. Native invoice draft</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Invoice lines store support item, pricing version, price limit, agreed rate, evidence status, and payment status permanently.</p>
          <button type="button" onClick={generateInvoice} className="mt-4 inline-flex items-center gap-2 rounded-md bg-sea px-4 py-3 text-sm font-semibold text-white"><ReceiptText size={17} /> Create invoice from completed shift</button>
          <div className="mt-4 space-y-3">
            {records.invoices.map((invoice) => {
              const lines = records.invoiceLines.filter((line) => line.invoiceId === invoice.id);
              return (
                <div key={invoice.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{invoice.invoiceNumber} - ${invoice.totalAmount}</p>
                    <StatusBadge label={`${invoice.status} / ${invoice.paymentStatus}`} tone={invoice.status === "review_required" ? "amber" : invoice.paymentStatus === "paid" ? "green" : "blue"} />
                  </div>
                  {lines.map((line) => <p key={line.id} className="mt-2 text-sm text-slate-600">{line.supportItemNumber} - {line.evidenceStatus} - {line.priceCheckStatus}{line.exceptionReason ? ` - ${line.exceptionReason}` : ""}</p>)}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => exportInvoice(invoice, lines)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"><FileDown size={16} /> PDF + CSV</button>
                    <button type="button" onClick={() => markInvoicePaymentStatus(invoice.id, "paid")} className="rounded-md border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700">Mark paid</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold text-ink">Billing exceptions</h2>
          <div className="mt-4 space-y-2">
            {!exceptionLines.length ? <p className="text-sm text-slate-600">No invoice exceptions yet.</p> : null}
            {exceptionLines.map((line) => <p key={line.id} className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900"><ShieldAlert className="mr-2 inline" size={16} />{line.exceptionReason}</p>)}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-ink">Budget usage</h2>
          <div className="mt-4 space-y-2">
            {!budgetRows.length ? <p className="text-sm text-slate-600">Create an agreement item to track budget usage.</p> : null}
            {budgetRows.map((budget) => <p key={budget.category} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{budget.category}: ${budget.used} used of ${budget.allocated} - {budget.warning}</p>)}
          </div>
        </Card>
      </div>

      {message ? <p className="rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">{message}</p> : null}
    </div>
  );
}

function StatusPanel({ records, exceptionCount }: { records: NativeBillingRecords; exceptionCount: number }) {
  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <StatusBadge label={`${records.shifts.length} shifts`} tone="blue" />
        <StatusBadge label={`${records.agreements.length} agreements`} tone="green" />
        <StatusBadge label={`${records.invoices.length} invoices`} tone="blue" />
        <StatusBadge label={`${exceptionCount} exceptions`} tone={exceptionCount ? "amber" : "green"} />
      </div>
    </div>
  );
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
