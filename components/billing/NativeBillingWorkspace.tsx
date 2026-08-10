"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, FileDown, Plus, ReceiptText, Save, ShieldAlert } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { ClientIdentity } from "@/components/participants/PrivateClientPhoto";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { downloadOrganisationReportHtml, getOrganisationProfile } from "@/lib/organisation-profile";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";
import { getTenantStaffInvites } from "@/lib/staff-records";
import {
  activatePricingVersion,
  addManualServiceAgreementItem,
  addServiceAgreementItem,
  buildInvoiceCsv,
  createInvoiceFromServices,
  createPricingVersionFromManualUpload,
  createServiceAgreement,
  getBudgetUsage,
  getInvoiceEligibility,
  getNativeBillingRecords,
  linkCompletedRosterService,
  markInvoicePaymentStatus,
  nativeBillingUpdatedEvent,
  waitForNativeBillingSave,
  type NativeBillingRecords,
  type NativeInvoice,
  type NativeInvoiceLine
} from "@/lib/native-billing";
import { loadTenantNativeBillingRecords } from "@/lib/native-billing-cloud";
import type { RosterShift } from "@/lib/roster";
import { loadTenantRosterShifts } from "@/lib/roster-cloud";

export function NativeBillingWorkspace() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [notes, setNotes] = useState<RetainedRecord[]>([]);
  const [records, setRecords] = useState<NativeBillingRecords>({ shifts: [], pricingVersions: [], supportItems: [], agreements: [], agreementItems: [], invoices: [], invoiceLines: [] });
  const [rosterServices, setRosterServices] = useState<RosterShift[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [agreementName, setAgreementName] = useState("");
  const [agreementStartDate, setAgreementStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [agreementEndDate, setAgreementEndDate] = useState("");
  const [billingFrequency, setBillingFrequency] = useState<"daily" | "weekly" | "fortnightly" | "monthly" | "custom">("fortnightly");
  const [recipientType, setRecipientType] = useState<"self_managed" | "plan_managed" | "agency_managed" | "other">("plan_managed");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedSupportItemId, setSelectedSupportItemId] = useState("");
  const [manualSupportCode, setManualSupportCode] = useState("");
  const [manualSupportName, setManualSupportName] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [ratePeriod, setRatePeriod] = useState<"hour" | "week" | "month">("hour");
  const [budgetAllocated, setBudgetAllocated] = useState("");
  const [allowTravel, setAllowTravel] = useState(false);
  const [allowKilometres, setAllowKilometres] = useState(false);
  const [allowNonFaceToFace, setAllowNonFaceToFace] = useState(false);
  const [allowCancellations, setAllowCancellations] = useState(false);
  const [message, setMessage] = useState("");
  const [savingAction, setSavingAction] = useState<"agreement" | "item" | "">("");
  const [creatingInvoiceId, setCreatingInvoiceId] = useState("");
  const [invoicePeriodStart, setInvoicePeriodStart] = useState(() => `${new Date().toISOString().slice(0, 7)}-01`);
  const [invoicePeriodEnd, setInvoicePeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedInvoiceServices, setSelectedInvoiceServices] = useState<Record<string, boolean>>({});
  const [serviceRateSelections, setServiceRateSelections] = useState<Record<string, string>>({});
  const activePricingVersion = useMemo(() => records.pricingVersions.find((version) => version.status === "active" && version.scope === "organisation")
    || records.pricingVersions.find((version) => version.status === "active"), [records.pricingVersions]);
  const draftPricingVersions = records.pricingVersions.filter((version) => version.status === "draft");
  const supportItems = useMemo(() => activePricingVersion
    ? records.supportItems.filter((item) => item.pricingVersionId === activePricingVersion.id)
    : [], [activePricingVersion, records.supportItems]);
  const selectedClient = clients.find((client) => client.id === selectedClientId) || clients[0];
  const selectedAgreement = selectedClient ? records.agreements.find((agreement) => agreement.participantId === selectedClient.id && agreement.status === "active") : undefined;
  const selectedSupportItem = supportItems.find((item) => item.id === selectedSupportItemId) || supportItems[0];
  const budgetRows = selectedClient ? getBudgetUsage(records, selectedClient.id) : [];
  const exceptionLines = records.invoiceLines.filter((line) => line.exceptionReason);
  const completedRosterServices = selectedClient ? rosterServices.filter((shift) =>
    shift.participantId === selectedClient.id
      && (shift.status === "Completed" || shift.status === "Note Completed")
      && shift.shiftDate >= invoicePeriodStart
      && shift.shiftDate <= invoicePeriodEnd
  ) : [];

  useEffect(() => {
    async function loadRecords() {
      const [clientItems, staffItems, noteItems] = await Promise.all([
        getTenantClients(true).catch(() => []),
        getTenantStaffInvites().catch(() => []),
        getTenantRetainedRecords("progress-note").catch(() => [])
      ]);
      setClients(clientItems);
      setNotes(noteItems);
      const rosterResult = await loadTenantRosterShifts();
      setRosterServices(rosterResult.shifts);
      setSelectedClientId((current) => current || clientItems[0]?.id || "");
      const cloudRecords = await loadTenantNativeBillingRecords(clientItems, staffItems);
      setRecords(cloudRecords);
    }

    function loadLocalRecords() {
      setRecords(getNativeBillingRecords());
    }

    function showCloudStatus(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      if (detail?.message) setMessage(detail.message);
    }

    void loadRecords();
    window.addEventListener(nativeBillingUpdatedEvent, loadLocalRecords);
    window.addEventListener("empowernotes:native-billing-cloud-status", showCloudStatus);
    return () => {
      window.removeEventListener(nativeBillingUpdatedEvent, loadLocalRecords);
      window.removeEventListener("empowernotes:native-billing-cloud-status", showCloudStatus);
    };
  }, []);

  useEffect(() => {
    const client = clients.find((item) => item.id === selectedClientId) || clients[0];
    setAgreementName(client ? `${client.name} NDIS service agreement` : "");
    setRecipientName(client?.name || "");
  }, [clients, selectedClientId]);

  useEffect(() => {
    const supportItem = supportItems.find((item) => item.id === selectedSupportItemId) || supportItems[0];
    if (!supportItem) return;
    setSelectedSupportItemId(supportItem.id);
    setAgreedRate(String(supportItem.priceLimit || ""));
    const unit = supportItem.unitType.toLowerCase();
    setRatePeriod(unit.includes("week") ? "week" : unit.includes("month") ? "month" : "hour");
  }, [selectedSupportItemId, supportItems]);

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

  async function saveAgreement() {
    if (!selectedClient) {
      setMessage("Add and select a client first.");
      return;
    }
    if (selectedClient.status === "inactive") {
      setMessage("This client is inactive. New service agreements cannot be created; only eligible services already delivered may be invoiced.");
      return;
    }

    setSavingAction("agreement");
    setMessage("Saving agreement...");
    const agreement = createServiceAgreement({
      participant: selectedClient,
      agreementName,
      startDate: agreementStartDate,
      endDate: agreementEndDate,
      billingFrequency,
      recipientType,
      recipientName,
      recipientEmail,
      planManagerName: recipientType === "plan_managed" ? recipientName : "",
      planManagerEmail: recipientType === "plan_managed" ? recipientEmail : ""
    });
    try {
      await waitForNativeBillingSave();
      setMessage(`${agreement.agreementName} saved for ${selectedClient.name}.`);
    } catch (error) {
      setMessage(`Agreement was not saved. ${getBillingError(error)}`);
    } finally {
      setSavingAction("");
    }
  }

  async function addAgreementItem() {
    if (!selectedAgreement) {
      setMessage("Save an active service agreement for this client first.");
      return;
    }
    if (!selectedSupportItem && !manualSupportName.trim()) {
      setMessage("Enter the agreed support name before saving its rate.");
      return;
    }
    const rate = Number(agreedRate);
    const budget = Number(budgetAllocated);
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(budget) || budget < 0) {
      setMessage("Enter a valid agreed rate and allocated budget.");
      return;
    }
    setSavingAction("item");
    setMessage("Saving agreed rate...");
    if (selectedSupportItem && activePricingVersion) {
      addServiceAgreementItem({
        agreement: selectedAgreement,
        supportItem: selectedSupportItem,
        pricingVersion: activePricingVersion,
        agreedRate: rate,
        ratePeriod,
        budgetAllocated: budget,
        allowTravel,
        allowKilometres,
        allowNonFaceToFace,
        allowCancellations
      });
    } else {
      addManualServiceAgreementItem({
        agreement: selectedAgreement,
        supportItemNumber: manualSupportCode,
        supportItemName: manualSupportName,
        agreedRate: rate,
        ratePeriod,
        budgetAllocated: budget,
        allowTravel,
        allowKilometres,
        allowNonFaceToFace,
        allowCancellations
      });
    }
    try {
      await waitForNativeBillingSave();
      setRecords(getNativeBillingRecords());
      setMessage(`${selectedSupportItem?.supportItemName || manualSupportName} saved at $${rate.toFixed(2)} per ${ratePeriod}.`);
      setBudgetAllocated("");
      if (!selectedSupportItem) {
        setManualSupportCode("");
        setManualSupportName("");
      }
    } catch (error) {
      setMessage(`The agreed rate was not saved. ${getBillingError(error)}`);
    } finally {
      setSavingAction("");
    }
  }

  function linkRenderedService(rosterShift: RosterShift) {
    if (!selectedAgreement) {
      setMessage("Create an active service agreement for this client before linking delivered support.");
      return;
    }
    const matchingNote = notes.find((note) => note.body.includes(rosterShift.participantName) || note.id.includes(rosterShift.participantId));
    const result = linkCompletedRosterService({ rosterShift, agreement: selectedAgreement, noteRecordId: matchingNote?.id });
    setMessage(result.error || (matchingNote
      ? "Completed service linked to its service agreement and progress-note evidence."
      : "Completed service linked. The invoice will flag that supporting note evidence is missing."));
  }

  async function generateHolisticInvoice() {
    const selections = Object.entries(selectedInvoiceServices)
      .filter(([, selected]) => selected)
      .map(([shiftId]) => ({ shiftId, agreementItemId: serviceRateSelections[shiftId] || "" }));
    if (!selections.length) {
      setMessage("Select at least one completed service for this invoice.");
      return;
    }
    if (selections.some((selection) => !selection.agreementItemId)) {
      setMessage("Choose the agreed support component for every selected service.");
      return;
    }

    setCreatingInvoiceId("batch");
    setMessage("Creating participant invoice draft...");
    const result = createInvoiceFromServices(selections, notes, selectedClient);
    if (result.error || !result.invoice) {
      setCreatingInvoiceId("");
      setMessage(result.error || "The invoice could not be created.");
      return;
    }

    try {
      await waitForNativeBillingSave();
      setRecords(getNativeBillingRecords());
      setSelectedInvoiceServices({});
      setMessage(`${result.invoice.invoiceNumber} created with ${result.lines.length} service line${result.lines.length === 1 ? "" : "s"}.`);
    } catch {
      setRecords(getNativeBillingRecords());
      setMessage("The invoice draft was not saved. Check your billing access and try again.");
    } finally {
      setCreatingInvoiceId("");
    }
  }

  function exportInvoice(invoice: NativeInvoice, lines: NativeInvoiceLine[]) {
    const organisation = getOrganisationProfile();
    const gstTotal = lines.reduce((total, line) => total + (line.gstCode.toLowerCase().includes("free") ? 0 : line.amount / 11), 0);
    const body = [
      `Invoice: ${invoice.invoiceNumber}`,
      `Invoice date: ${invoice.invoiceDate}`,
      `Due date: ${invoice.dueDate}`,
      `Participant: ${invoice.participantName}`,
      `Participant NDIS number: ${invoice.participantNdisNumber || "Not recorded"}`,
      `Recipient: ${invoice.recipientName}`,
      `Recipient email: ${invoice.recipientEmail || "Not recorded"}`,
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
        `GST treatment: ${line.gstCode}`,
        `Pricing version: ${line.pricingVersionName}`,
        `Evidence linked: ${line.evidenceStatus === "evidence_linked" || line.evidenceStatus === "approved" ? "Yes" : "No"}`,
        `Support note reference: ${line.noteReference}`,
        `Service record reference: ${line.shiftId}`,
        `Price check: ${line.priceCheckStatus}`
      ].join("\n")),
      "",
      `Subtotal: $${invoice.totalAmount.toFixed(2)}`,
      `GST: $${gstTotal.toFixed(2)}`,
      `Total: $${invoice.totalAmount}`,
      `Payment status: ${invoice.paymentStatus}`,
      `Payment terms: ${organisation.paymentTerms || "Payment due within 14 days."}`,
      `Payment instructions: ${organisation.paymentInstructions || "Contact the provider for payment instructions."}`
    ].join("\n\n");
    downloadOrganisationReportHtml(`${invoice.invoiceNumber}.html`, "EmpowerNotes Native Invoice", body);
    downloadCsv(`${invoice.invoiceNumber}.csv`, buildInvoiceCsv(invoice, lines));
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Service delivery and native invoicing</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Evidence-backed NDIS billing workflow</h2>
            <p className="mt-2 text-sm text-slate-600">Agreement, delivered service, evidence, invoice.</p>
          </div>
          <StatusBadge label="No Xero dependency" tone="green" />
        </div>
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">This invoice uses the selected NDIS Pricing Arrangements and Price Limits version. Confirm the support item, claim type and billing rules before issuing.</p>
      </Card>

      {message ? <div role="status" aria-live="polite" className="sticky top-3 z-20 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 shadow-sm">{message}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Client
            <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={selectedClient?.id || ""} onChange={(event) => setSelectedClientId(event.target.value)}>
              {!clients.length ? <option>Add a client first</option> : null}
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>
          <ClientIdentity client={selectedClient} detail={[selectedClient?.primaryHouseName, selectedClient?.serviceName].filter(Boolean).join(" - ")} className="mt-2 rounded-md border border-slate-200 bg-white p-3" />
        </div>
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

        <Card className="xl:col-span-2">
          <h2 className="text-xl font-semibold text-ink">2. Service agreement</h2>
          <p className="mt-1 text-sm text-slate-600">Set the agreement, then add its funded rates.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <BillingField label="Agreement name" value={agreementName} onChange={setAgreementName} />
            <BillingField label="Start date" value={agreementStartDate} onChange={setAgreementStartDate} type="date" />
            <BillingField label="End date" value={agreementEndDate} onChange={setAgreementEndDate} type="date" />
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Billing frequency
              <select value={billingFrequency} onChange={(event) => setBillingFrequency(event.target.value as typeof billingFrequency)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Invoice recipient type
              <select value={recipientType} onChange={(event) => setRecipientType(event.target.value as typeof recipientType)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3">
                <option value="self_managed">Self-managed</option>
                <option value="plan_managed">Plan-managed</option>
                <option value="agency_managed">Agency-managed</option>
                <option value="other">Other</option>
              </select>
            </label>
            <BillingField label={recipientType === "plan_managed" ? "Plan manager / recipient name" : "Invoice recipient name"} value={recipientName} onChange={setRecipientName} />
            <BillingField label="Recipient email" value={recipientEmail} onChange={setRecipientEmail} type="email" />
          </div>
          <button type="button" disabled={Boolean(savingAction)} onClick={() => void saveAgreement()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">
            <Save size={17} aria-hidden="true" /> {savingAction === "agreement" ? "Saving..." : selectedAgreement ? "Update agreement" : "Save agreement"}
          </button>

          <div id="agreed-support-items" className="mt-6 scroll-mt-24 border-t border-slate-200 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink">Agreed support items</h3>
                <p className="mt-1 text-sm text-slate-600">Choose the support, rate period and budget.</p>
              </div>
              <StatusBadge label={selectedAgreement ? "Active agreement" : "Save agreement first"} tone={selectedAgreement ? "green" : "amber"} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {supportItems.length ? (
                <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                  Support item
                  <select value={selectedSupportItem?.id || ""} onChange={(event) => setSelectedSupportItemId(event.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3">
                    {supportItems.map((item) => <option key={item.id} value={item.id}>{item.supportItemNumber} - {item.supportItemName}</option>)}
                  </select>
                </label>
              ) : (
                <div className="grid gap-4 md:col-span-2 md:grid-cols-[0.7fr_1.3fr]">
                  <BillingField label="Support code (optional)" value={manualSupportCode} onChange={setManualSupportCode} />
                  <BillingField label="Agreed support name" value={manualSupportName} onChange={setManualSupportName} />
                </div>
              )}
              <BillingField label="Agreed rate" value={agreedRate} onChange={setAgreedRate} type="number" />
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Rate period
                <select value={ratePeriod} onChange={(event) => setRatePeriod(event.target.value as typeof ratePeriod)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3">
                  <option value="hour">Hourly</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </select>
              </label>
              <BillingField label="Allocated budget" value={budgetAllocated} onChange={setBudgetAllocated} type="number" />
            </div>
            {!supportItems.length ? <p className="mt-3 text-sm text-slate-600">This rate will be saved from the client service agreement. Add an NDIS pricing catalogue later when automatic price-limit checking is required.</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <BillingCheck label="Travel" checked={allowTravel} onChange={setAllowTravel} />
              <BillingCheck label="Kilometres" checked={allowKilometres} onChange={setAllowKilometres} />
              <BillingCheck label="Non-face-to-face" checked={allowNonFaceToFace} onChange={setAllowNonFaceToFace} />
              <BillingCheck label="Cancellations" checked={allowCancellations} onChange={setAllowCancellations} />
            </div>
            <button type="button" disabled={Boolean(savingAction)} onClick={() => void addAgreementItem()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">
              <Plus size={17} aria-hidden="true" /> {savingAction === "item" ? "Saving..." : "Save agreed rate"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {records.agreements.map((agreement) => {
              const items = records.agreementItems.filter((item) => item.serviceAgreementId === agreement.id);
              return (
                <div key={agreement.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{agreement.agreementName}</p>
                    <StatusBadge label={agreement.status} tone={agreement.status === "active" ? "green" : "blue"} />
                  </div>
                  <p className="mt-1">{agreement.participantName} - {agreement.startDate || "No start date"} to {agreement.endDate || "Ongoing"} - {agreement.billingFrequency}</p>
                  <div className="mt-2 space-y-1">
                    {items.map((item) => <p key={item.id}>{item.supportItemNumber} - ${item.agreedRate.toFixed(2)} / {item.unitType} - ${item.budgetAllocated.toFixed(2)} budget</p>)}
                    {!items.length ? <p className="text-amber-800">No agreed support items added.</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-ink">3. Completed services</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Choose the billing period, then map each completed service to the agreed support component that was delivered.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BillingField label="Billing period from" value={invoicePeriodStart} onChange={setInvoicePeriodStart} type="date" />
            <BillingField label="Billing period to" value={invoicePeriodEnd} onChange={setInvoicePeriodEnd} type="date" />
          </div>
          <div className="mt-4 space-y-3">
            {!completedRosterServices.length ? <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">No completed roster services are available for this client.</p> : null}
            {completedRosterServices.map((shift) => {
              const billingService = records.shifts.find((item) => item.rosterShiftId === shift.id);
              const linked = Boolean(billingService);
              const agreementItem = billingService
                ? records.agreementItems.find((item) => item.id === serviceRateSelections[billingService.id])
                : undefined;
              const availableAgreementItems = billingService
                ? records.agreementItems.filter((item) => item.serviceAgreementId === billingService.serviceAgreementId && item.status === "active")
                : [];
              const invoiced = Boolean(billingService && records.invoiceLines.some((line) => line.shiftId === billingService.id && line.approvalStatus !== "needs_correction"));
              const invoiceEligibility = billingService && selectedAgreement
                ? getInvoiceEligibility(shift.shiftDate, selectedAgreement, selectedClient, `${shift.shiftDate}T${shift.startTime}:00`)
                : { allowed: true, reason: "" };
              return (
                <div key={shift.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold text-ink">{shift.shiftDate} - {shift.supportType}</p>
                  <p className="mt-1 text-sm text-slate-600">{shift.startTime}-{shift.endTime} - {shift.location} - {shift.assignedWorkers?.map((worker) => worker.name).join(", ") || shift.workerName}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={linked} onClick={() => linkRenderedService(shift)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">
                      <ClipboardCheck size={16} aria-hidden="true" />{linked ? "Linked to billing" : "Link rendered service"}
                    </button>
                    {billingService && availableAgreementItems.length ? (
                      <label className="flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink">
                        <input type="checkbox" disabled={invoiced || !invoiceEligibility.allowed} checked={Boolean(selectedInvoiceServices[billingService.id])} onChange={(event) => setSelectedInvoiceServices((current) => ({ ...current, [billingService.id]: event.target.checked }))} />
                        {invoiced ? "Already invoiced" : "Include in invoice"}
                      </label>
                    ) : billingService ? (
                      <a href="#agreed-support-items" className="inline-flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200">
                        <Plus size={16} aria-hidden="true" />Add agreed rate first
                      </a>
                    ) : null}
                  </div>
                  {billingService && availableAgreementItems.length ? (
                    <label className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
                      Agreed support component
                      <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={serviceRateSelections[billingService.id] || ""} onChange={(event) => setServiceRateSelections((current) => ({ ...current, [billingService.id]: event.target.value }))}>
                        <option value="">Select the support delivered</option>
                        {availableAgreementItems.map((item) => <option key={item.id} value={item.id}>{item.supportItemNumber} - {item.supportItemName} - ${item.agreedRate.toFixed(2)} / {item.unitType}</option>)}
                      </select>
                    </label>
                  ) : null}
                  {billingService && !availableAgreementItems.length ? <p className="mt-3 text-sm font-semibold text-amber-800">Add the client&apos;s agreed support components before invoicing this service.</p> : null}
                  {billingService && agreementItem && !invoiceEligibility.allowed ? <p className="mt-3 text-sm font-semibold text-red-700">{invoiceEligibility.reason}</p> : null}
                </div>
              );
            })}
          </div>
          <button type="button" disabled={creatingInvoiceId === "batch" || !Object.values(selectedInvoiceServices).some(Boolean)} onClick={() => void generateHolisticInvoice()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            <ReceiptText size={17} aria-hidden="true" />{creatingInvoiceId === "batch" ? "Creating invoice..." : `Create participant invoice (${Object.values(selectedInvoiceServices).filter(Boolean).length})`}
          </button>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-ink">4. Native invoice draft</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Invoice lines are generated only from linked services rendered and store the agreement item, pricing limit, agreed rate, evidence and payment status.</p>
          <div className="mt-4 space-y-3">
            {records.invoices.map((invoice) => {
              const lines = records.invoiceLines.filter((line) => line.invoiceId === invoice.id);
              return (
                <div key={invoice.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{invoice.invoiceNumber} - ${invoice.totalAmount}</p>
                    <StatusBadge label={`${invoice.status} / ${invoice.paymentStatus}`} tone={invoice.status === "review_required" ? "amber" : invoice.paymentStatus === "paid" ? "green" : "blue"} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{invoice.participantName} · {invoice.billingPeriodStart} to {invoice.billingPeriodEnd} · {lines.length} line{lines.length === 1 ? "" : "s"}</p>
                  <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Support</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Rate</th><th className="px-3 py-2">Amount</th></tr></thead>
                      <tbody>
                        {lines.map((line) => <tr key={line.id} className="border-t border-slate-200"><td className="px-3 py-2">{line.serviceDate}</td><td className="px-3 py-2"><span className="font-semibold text-ink">{line.supportItemNumber}</span><br />{line.supportItemName}</td><td className="px-3 py-2">{line.quantity} {line.unitType}</td><td className="px-3 py-2">${line.rate.toFixed(2)}</td><td className="px-3 py-2 font-semibold text-ink">${line.amount.toFixed(2)}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                  {lines.filter((line) => line.exceptionReason).map((line) => <p key={`${line.id}-warning`} className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{line.supportItemName}: {line.exceptionReason}</p>)}
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

    </div>
  );
}

function StatusPanel({ records, exceptionCount }: { records: NativeBillingRecords; exceptionCount: number }) {
  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <StatusBadge label={`${records.shifts.length} rendered services`} tone="blue" />
        <StatusBadge label={`${records.agreements.length} agreements`} tone="green" />
        <StatusBadge label={`${records.invoices.length} invoices`} tone="blue" />
        <StatusBadge label={`${exceptionCount} exceptions`} tone={exceptionCount ? "amber" : "green"} />
      </div>
    </div>
  );
}

function BillingField({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "date" | "number";
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-ink"
      />
    </label>
  );
}

function BillingCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-teal-700" />
      {label}
    </label>
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

function getBillingError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Check that your account has Billing access and try again.";
}
