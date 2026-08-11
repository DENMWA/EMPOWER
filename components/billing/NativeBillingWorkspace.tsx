"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, FileDown, FileSearch, Plus, ReceiptText, Save, ShieldAlert } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { ClientIdentity } from "@/components/participants/PrivateClientPhoto";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
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
  getBillableQuantity,
  matchNdisSupportItems,
  getNativeBillingRecords,
  linkCompletedRosterService,
  markInvoicePaymentStatus,
  nativeBillingUpdatedEvent,
  updateSupportShiftTravel,
  waitForNativeBillingSave,
  type NativeBillingRecords,
  type NativeInvoice,
  type NativeInvoiceLine,
  type InvoiceRateSource
} from "@/lib/native-billing";
import { loadTenantNativeBillingRecords } from "@/lib/native-billing-cloud";
import type { RosterShift } from "@/lib/roster";
import { loadTenantRosterShifts } from "@/lib/roster-cloud";
import { getStoredAccessToken } from "@/lib/supabase-rest";

type TravelDraft = { odometerStart: string; odometerEnd: string; rate: string; supportItemNumber: string; notes: string };
type ServiceRateDraft = { source: InvoiceRateSource; itemId: string; manualCode: string; manualRate: string; manualUnit: string; approved: boolean };
type AgreementDraftItem = {
  id: string;
  supportItemNumber: string;
  supportItemName: string;
  agreedRate: string;
  unitType: "hour" | "day" | "week" | "month" | "each" | "km";
  budgetAllocated: string;
  allowTravel: boolean;
  allowKilometres: boolean;
  allowNonFaceToFace: boolean;
  allowCancellations: boolean;
  confidence: number;
  sourceText: string;
  ndisSupportItemId: string;
  approved: boolean;
};

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
  const [ratePeriod, setRatePeriod] = useState<"hour" | "day" | "week" | "month" | "each" | "km">("hour");
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
  const [serviceRateDrafts, setServiceRateDrafts] = useState<Record<string, ServiceRateDraft>>({});
  const [includedTravel, setIncludedTravel] = useState<Record<string, boolean>>({});
  const [travelDrafts, setTravelDrafts] = useState<Record<string, TravelDraft>>({});
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [agreementDraftItems, setAgreementDraftItems] = useState<AgreementDraftItem[]>([]);
  const [agreementSourceFile, setAgreementSourceFile] = useState("");
  const [parsingAgreement, setParsingAgreement] = useState(false);
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

  async function parseServiceAgreement() {
    if (!agreementFile || !selectedClient) {
      setMessage("Choose a client and service agreement document first.");
      return;
    }
    const token = getStoredAccessToken();
    if (!token) {
      setMessage("Sign in before using agreement extraction.");
      return;
    }
    setParsingAgreement(true);
    setMessage("Reading service agreement for review...");
    const form = new FormData();
    form.append("file", agreementFile);
    try {
      const response = await fetch("/api/billing/parse-service-agreement", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const result = await response.json() as Record<string, unknown> & { error?: string; items?: Array<Record<string, unknown>> };
      if (!response.ok) throw new Error(result.error || "Agreement extraction failed.");
      const allowedUnits = new Set(["hour", "day", "week", "month", "each", "km"]);
      const items = (result.items || []).map((item, index): AgreementDraftItem => {
        const supportItemNumber = typeof item.supportItemNumber === "string" ? item.supportItemNumber : "";
        const supportItemName = typeof item.supportItemName === "string" ? item.supportItemName : "";
        const ndisMatch = findAgreementNdisMatch(supportItemNumber, supportItemName, records);
        return {
        id: `agreement-draft-${Date.now()}-${index}`,
        supportItemNumber,
        supportItemName,
        agreedRate: typeof item.agreedRate === "number" ? String(item.agreedRate) : "",
        unitType: allowedUnits.has(String(item.unitType)) ? String(item.unitType) as AgreementDraftItem["unitType"] : "hour",
        budgetAllocated: typeof item.budgetAllocated === "number" ? String(item.budgetAllocated) : "0",
        allowTravel: item.allowTravel === true,
        allowKilometres: item.allowKilometres === true,
        allowNonFaceToFace: item.allowNonFaceToFace === true,
        allowCancellations: item.allowCancellations === true,
        confidence: typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0,
        sourceText: typeof item.sourceText === "string" ? item.sourceText : "",
        ndisSupportItemId: ndisMatch?.id || "",
        approved: false
      }});
      setAgreementDraftItems(items);
      setAgreementSourceFile(typeof result.sourceFileName === "string" ? result.sourceFileName : agreementFile.name);
      if (typeof result.agreementName === "string" && result.agreementName) setAgreementName(result.agreementName);
      if (typeof result.startDate === "string" && result.startDate) setAgreementStartDate(result.startDate);
      if (typeof result.endDate === "string") setAgreementEndDate(result.endDate);
      if (typeof result.recipientName === "string") setRecipientName(result.recipientName);
      if (typeof result.recipientEmail === "string") setRecipientEmail(result.recipientEmail);
      setMessage(`${items.length} agreement rate${items.length === 1 ? "" : "s"} extracted. Review and edit before approval.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Agreement extraction failed.");
    } finally {
      setParsingAgreement(false);
    }
  }

  function updateAgreementDraftItem(id: string, patch: Partial<AgreementDraftItem>) {
    setAgreementDraftItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function approveExtractedRates() {
    if (!selectedClient) return;
    const approvedItems = agreementDraftItems.filter((item) => item.approved);
    if (!approvedItems.length) {
      setMessage("Select at least one reviewed rate to approve.");
      return;
    }
    if (approvedItems.some((item) => !item.supportItemName.trim() || !Number.isFinite(Number(item.agreedRate)) || Number(item.agreedRate) <= 0)) {
      setMessage("Every approved entry needs a support name and valid rate.");
      return;
    }
    setSavingAction("item");
    const agreement = selectedAgreement || createServiceAgreement({
      participant: selectedClient,
      agreementName,
      startDate: agreementStartDate,
      endDate: agreementEndDate,
      billingFrequency,
      recipientType,
      recipientName,
      recipientEmail
    });
    approvedItems.forEach((item) => {
      const supportItem = records.supportItems.find((candidate) => candidate.id === item.ndisSupportItemId);
      const pricingVersion = supportItem ? records.pricingVersions.find((version) => version.id === supportItem.pricingVersionId) : undefined;
      const common = {
        agreement,
        agreedRate: Number(item.agreedRate),
        ratePeriod: item.unitType,
        budgetAllocated: Number(item.budgetAllocated) || 0,
        allowTravel: item.allowTravel,
        allowKilometres: item.allowKilometres,
        allowNonFaceToFace: item.allowNonFaceToFace,
        allowCancellations: item.allowCancellations
      };
      if (supportItem && pricingVersion) addServiceAgreementItem({ ...common, supportItem, pricingVersion });
      else addManualServiceAgreementItem({ ...common, supportItemNumber: item.supportItemNumber, supportItemName: item.supportItemName });
    });
    try {
      await waitForNativeBillingSave();
      setRecords(getNativeBillingRecords());
      setAgreementDraftItems([]);
      setMessage(`${approvedItems.length} reviewed rate${approvedItems.length === 1 ? "" : "s"} approved and transferred to billing.`);
    } catch (error) {
      setMessage(`Approved rates were not saved. ${getBillingError(error)}`);
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

  function getTravelDraft(shiftId: string): TravelDraft {
    const shift = records.shifts.find((item) => item.id === shiftId);
    return travelDrafts[shiftId] || {
      odometerStart: shift?.odometerStart?.toString() || "",
      odometerEnd: shift?.odometerEnd?.toString() || "",
      rate: shift?.travelRatePerKilometre?.toString() || "",
      supportItemNumber: shift?.travelSupportItemNumber || "",
      notes: shift?.travelNotes || ""
    };
  }

  function updateTravelDraft(shiftId: string, field: keyof TravelDraft, value: string) {
    setTravelDrafts((current) => ({ ...current, [shiftId]: { ...getTravelDraft(shiftId), [field]: value } }));
  }

  async function saveTravelEvidence(shiftId: string) {
    const draft = getTravelDraft(shiftId);
    const result = updateSupportShiftTravel(shiftId, {
      odometerStart: Number(draft.odometerStart),
      odometerEnd: Number(draft.odometerEnd),
      ratePerKilometre: Number(draft.rate),
      supportItemNumber: draft.supportItemNumber,
      notes: draft.notes
    });
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setSavingAction("item");
    setMessage("Saving travel evidence...");
    try {
      await waitForNativeBillingSave();
      setRecords(getNativeBillingRecords());
      setIncludedTravel((current) => ({ ...current, [shiftId]: true }));
      setMessage(`${result.shift?.travelKilometres || 0} km saved from the odometer readings.`);
    } catch (error) {
      setMessage(`Travel evidence was not saved. ${getBillingError(error)}`);
    } finally {
      setSavingAction("");
    }
  }

  async function generateHolisticInvoice() {
    const selections = Object.entries(selectedInvoiceServices)
      .filter(([, selected]) => selected)
      .map(([shiftId]) => {
        const service = records.shifts.find((item) => item.id === shiftId);
        const draft = serviceRateDrafts[shiftId] || (service ? getSuggestedRateDraft(service, records) : getDefaultRateDraft());
        return {
          shiftId,
          rateSource: draft.source,
          approved: draft.approved,
          agreementItemId: draft.source === "service_agreement" ? draft.itemId : undefined,
          supportItemId: draft.source === "ndis_catalogue" ? draft.itemId : undefined,
          manualSupportItemNumber: draft.source === "manual" ? draft.manualCode : undefined,
          manualRate: draft.source === "manual" ? Number(draft.manualRate) : undefined,
          manualUnitType: draft.source === "manual" ? draft.manualUnit : undefined,
          includeTravel: Boolean(includedTravel[shiftId])
        };
      });
    if (!selections.length) {
      setMessage("Select at least one completed service for this invoice.");
      return;
    }
    if (selections.some((selection) => !selection.approved)) {
      setMessage("Approve the rate and support code for every selected service.");
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

  async function exportInvoice(invoice: NativeInvoice, lines: NativeInvoiceLine[]) {
    setMessage(`Preparing ${invoice.invoiceNumber}...`);
    const response = await fetch("/api/billing/invoice-pdf", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getStoredAccessToken()}` }, body: JSON.stringify({ invoiceId: invoice.id }) });
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { message?: string };
      setMessage(result.message || "The PDF could not be generated.");
      return;
    }
    downloadBlob(`${invoice.invoiceNumber}.pdf`, await response.blob());
    downloadCsv(`${invoice.invoiceNumber}.csv`, buildInvoiceCsv(invoice, lines));
    setMessage(`${invoice.invoiceNumber} downloaded as a secure A4 PDF and CSV.`);
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-100 bg-gradient-to-r from-white to-teal-50/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-sea">Invoice workspace</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">From service to invoice</h2>
          </div>
          <StatusBadge label="NDIS aligned" tone="green" />
        </div>
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
          <h2 className="text-xl font-semibold text-ink">1. Pricing</h2>
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

          <div className="mt-5 rounded-md border border-sky-200 bg-sky-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">Import agreement with AI</p>
                <p className="mt-1 text-sm text-slate-600">Extract, review, approve.</p>
              </div>
              <StatusBadge label={agreementDraftItems.length ? "Review required" : "No active draft"} tone={agreementDraftItems.length ? "amber" : "blue"} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input type="file" accept=".pdf,.docx,.txt" onChange={(event) => setAgreementFile(event.target.files?.[0] || null)} className="min-h-11 max-w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
              <button type="button" disabled={parsingAgreement || !agreementFile} onClick={() => void parseServiceAgreement()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
                <FileSearch size={17} aria-hidden="true" />{parsingAgreement ? "Reading agreement..." : "Extract rates for review"}
              </button>
            </div>
            {agreementDraftItems.length ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Source: {agreementSourceFile}</p>
                {agreementDraftItems.map((item) => {
                  const ndisItem = records.supportItems.find((candidate) => candidate.id === item.ndisSupportItemId);
                  return (
                  <div key={item.id} className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <BillingField label="Support code" value={item.supportItemNumber} onChange={(value) => updateAgreementDraftItem(item.id, { supportItemNumber: value })} />
                      <div className="xl:col-span-2"><BillingField label="Support name" value={item.supportItemName} onChange={(value) => updateAgreementDraftItem(item.id, { supportItemName: value })} /></div>
                      <BillingField label="Agreed rate" type="number" value={item.agreedRate} onChange={(value) => updateAgreementDraftItem(item.id, { agreedRate: value })} />
                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Unit
                        <select value={item.unitType} onChange={(event) => updateAgreementDraftItem(item.id, { unitType: event.target.value as AgreementDraftItem["unitType"] })} className="min-h-11 rounded-md border border-slate-300 bg-white px-3">
                          <option value="hour">Hourly</option><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option><option value="each">Each</option><option value="km">Kilometre</option>
                        </select>
                      </label>
                      <BillingField label="Allocated budget" type="number" value={item.budgetAllocated} onChange={(value) => updateAgreementDraftItem(item.id, { budgetAllocated: value })} />
                    </div>
                    <label className="mt-3 grid gap-2 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-ink">
                      NDIS catalogue comparison
                      <select value={item.ndisSupportItemId} onChange={(event) => updateAgreementDraftItem(item.id, { ndisSupportItemId: event.target.value, approved: false })} className="min-h-11 rounded-md border border-slate-300 bg-white px-3">
                        <option value="">No matching NDIS item selected</option>
                        {records.supportItems.filter((candidate) => candidate.priceLimit !== null).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.supportItemNumber} - ${candidate.priceLimit?.toFixed(2)} / {candidate.unitType}</option>)}
                      </select>
                      {ndisItem ? <span className="font-normal text-teal-900">NDIS code {ndisItem.supportItemNumber} · advised limit ${ndisItem.priceLimit?.toFixed(2)} / {ndisItem.unitType}. Agreement rate: ${Number(item.agreedRate || 0).toFixed(2)} / {item.unitType}.</span> : <span className="font-normal text-amber-800">Confirm the agreement manually when no matching NDIS code is available.</span>}
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <BillingCheck label="Travel" checked={item.allowTravel} onChange={(value) => updateAgreementDraftItem(item.id, { allowTravel: value })} />
                      <BillingCheck label="Kilometres" checked={item.allowKilometres} onChange={(value) => updateAgreementDraftItem(item.id, { allowKilometres: value })} />
                      <BillingCheck label="Non-face-to-face" checked={item.allowNonFaceToFace} onChange={(value) => updateAgreementDraftItem(item.id, { allowNonFaceToFace: value })} />
                      <BillingCheck label="Cancellations" checked={item.allowCancellations} onChange={(value) => updateAgreementDraftItem(item.id, { allowCancellations: value })} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-500">Agreement evidence · {Math.round(item.confidence * 100)}% extraction confidence</p>
                        <p className="mt-1 text-sm text-slate-700">{item.sourceText || "No supporting source excerpt was returned. Confirm against the document before approval."}</p>
                      </div>
                      <label className="inline-flex min-h-11 items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800">
                        <input type="checkbox" checked={item.approved} onChange={(event) => updateAgreementDraftItem(item.id, { approved: event.target.checked })} /> Reviewed and approved
                      </label>
                    </div>
                  </div>
                )})}
                <button type="button" disabled={Boolean(savingAction) || !agreementDraftItems.some((item) => item.approved)} onClick={() => void approveExtractedRates()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
                  <Check size={17} aria-hidden="true" />Approve selected rates
                </button>
              </div>
            ) : null}
          </div>

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
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="each">Each</option>
                  <option value="km">Kilometre</option>
                </select>
              </label>
              <BillingField label="Allocated budget" value={budgetAllocated} onChange={setBudgetAllocated} type="number" />
            </div>
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
          <p className="mt-1 text-sm text-slate-600">Select completed supports for this invoice.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BillingField label="Billing period from" value={invoicePeriodStart} onChange={setInvoicePeriodStart} type="date" />
            <BillingField label="Billing period to" value={invoicePeriodEnd} onChange={setInvoicePeriodEnd} type="date" />
          </div>
          <div className="mt-4 space-y-3">
            {!completedRosterServices.length ? <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">No completed roster services are available for this client.</p> : null}
            {completedRosterServices.map((shift) => {
              const billingService = records.shifts.find((item) => item.rosterShiftId === shift.id);
              const linked = Boolean(billingService);
              const availableAgreementItems = billingService
                ? records.agreementItems.filter((item) => item.serviceAgreementId === billingService.serviceAgreementId && item.status === "active")
                : [];
              const ndisMatches = billingService ? matchNdisSupportItems(billingService, records.supportItems, records.pricingVersions) : [];
              const rateDraft = billingService ? serviceRateDrafts[billingService.id] || getSuggestedRateDraft(billingService, records) : getDefaultRateDraft();
              const agreementItem = rateDraft.source === "service_agreement" ? records.agreementItems.find((item) => item.id === rateDraft.itemId) : undefined;
              const selectedNdisItem = rateDraft.source === "ndis_catalogue" ? records.supportItems.find((item) => item.id === rateDraft.itemId) : ndisMatches[0]?.item;
              const assignedStaffCount = billingService ? Math.max(1, billingService.assignedStaffCount || 1) : 1;
              const expectedStaffCount = billingService ? getRatioStaffCount(billingService.staffingRatio) : 0;
              const ratioMismatch = Boolean(expectedStaffCount && expectedStaffCount !== assignedStaffCount);
              const selectedUnit = rateDraft.source === "ndis_catalogue"
                ? records.supportItems.find((item) => item.id === rateDraft.itemId)?.unitType
                : rateDraft.source === "service_agreement" ? agreementItem?.unitType : rateDraft.manualUnit;
              const billableQuantity = billingService && selectedUnit ? getBillableQuantity(billingService, selectedUnit) : 0;
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
                      <ClipboardCheck size={16} aria-hidden="true" />{linked ? "Linked" : "Link service"}
                    </button>
                    {billingService ? (
                      <label className="flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink">
                        <input type="checkbox" disabled={invoiced || !invoiceEligibility.allowed} checked={Boolean(selectedInvoiceServices[billingService.id])} onChange={(event) => setSelectedInvoiceServices((current) => ({ ...current, [billingService.id]: event.target.checked }))} />
                        {invoiced ? "Already invoiced" : "Include in invoice"}
                      </label>
                    ) : null}
                  </div>
                  {billingService ? (
                    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-200 p-1" aria-label="Rate source">
                        {([['ndis_catalogue', 'NDIS advised rate'], ['service_agreement', 'Service agreement rate'], ['manual', 'Manual override']] as const).map(([source, label]) => (
                          <button key={source} type="button" onClick={() => setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...getDefaultRateDraft(), source } }))} className={`min-h-10 rounded px-2 text-xs font-semibold sm:text-sm ${rateDraft.source === source ? 'bg-white text-ink shadow-sm' : 'text-slate-600'}`}>{label}</button>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-md border border-teal-200 bg-white p-3 text-sm">
                          <p className="font-semibold text-ink">NDIS advised rate</p>
                          <p className="mt-1 text-slate-700">{selectedNdisItem ? `${selectedNdisItem.supportItemNumber} · $${selectedNdisItem.priceLimit?.toFixed(2)} / ${selectedNdisItem.unitType}` : "No catalogue match available"}</p>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                          <p className="font-semibold text-ink">Service agreement rate</p>
                          <p className="mt-1 text-slate-700">{availableAgreementItems[0] ? `${availableAgreementItems[0].supportItemNumber} · $${availableAgreementItems[0].agreedRate.toFixed(2)} / ${availableAgreementItems[0].unitType}` : "No approved agreement rate available"}</p>
                        </div>
                      </div>
                      {rateDraft.source === "ndis_catalogue" ? (
                        <label className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
                          Suggested NDIS support code
                          <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={rateDraft.itemId} onChange={(event) => setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...rateDraft, itemId: event.target.value, approved: false } }))}>
                            <option value="">Review and select a match</option>
                            {ndisMatches.map(({ item, confidence }) => <option key={item.id} value={item.id}>{item.supportItemNumber} - ${item.priceLimit?.toFixed(2)} / {item.unitType} - {confidence}% match</option>)}
                          </select>
                          {!ndisMatches.length ? <span className="font-normal text-amber-800">No priced item is available in the active NDIS catalogue.</span> : null}
                        </label>
                      ) : null}
                      {rateDraft.source === "service_agreement" ? (
                        <label className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
                          Agreed support code and rate
                          <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={rateDraft.itemId} onChange={(event) => setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...rateDraft, itemId: event.target.value, approved: false } }))}>
                            <option value="">Select an agreed support</option>
                            {availableAgreementItems.map((item) => <option key={item.id} value={item.id}>{item.supportItemNumber} - ${item.agreedRate.toFixed(2)} / {item.unitType}</option>)}
                          </select>
                        </label>
                      ) : null}
                      {rateDraft.source === "manual" ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <BillingField label="Support code" value={rateDraft.manualCode} onChange={(value) => setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...rateDraft, manualCode: value, approved: false } }))} />
                          <BillingField label="Rate" type="number" value={rateDraft.manualRate} onChange={(value) => setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...rateDraft, manualRate: value, approved: false } }))} />
                          <label className="grid gap-2 text-sm font-semibold text-slate-700">Unit<select value={rateDraft.manualUnit} onChange={(event) => setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...rateDraft, manualUnit: event.target.value, approved: false } }))} className="min-h-11 rounded-md border border-slate-300 bg-white px-3"><option value="hour">Hour</option><option value="day">Day</option><option value="each">Each</option><option value="km">Kilometre</option></select></label>
                        </div>
                      ) : null}
                      <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${ratioMismatch ? "border-red-200 bg-red-50 text-red-800" : "border-teal-200 bg-teal-50 text-teal-900"}`}>
                        <p className="font-semibold">{billingService.staffingRatio || `${assignedStaffCount}:1`} support · {assignedStaffCount} assigned staff</p>
                        <p className="mt-1">{selectedUnit?.toLowerCase().includes("hour") && billableQuantity ? `${formatServiceHours(billingService.startTime, billingService.endTime)} service hours × ${assignedStaffCount} staff = ${billableQuantity} billable hours` : "Quantity is confirmed from the selected billing unit."}</p>
                        {ratioMismatch ? <p className="mt-1 font-semibold">The roster ratio and assigned staff do not match. Correct the roster before invoicing.</p> : null}
                      </div>
                      <label className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" disabled={ratioMismatch} checked={!ratioMismatch && rateDraft.approved} onChange={(event) => setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...rateDraft, approved: event.target.checked } }))} />Approve selected code, staffing ratio and calculated rate</label>
                    </div>
                  ) : null}
                  {billingService && agreementItem?.allowTravel && agreementItem.allowKilometres ? (() => {
                    const travel = getTravelDraft(billingService.id);
                    const distance = Math.max(0, Number(travel.odometerEnd || 0) - Number(travel.odometerStart || 0));
                    return (
                      <div className="mt-3 rounded-md border border-teal-200 bg-teal-50/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-ink">Travel and kilometres</p>
                            <p className="mt-1 text-xs text-slate-600">Record vehicle evidence and use the rate agreed for this participant.</p>
                          </div>
                          <label className="inline-flex items-center gap-2 text-sm font-semibold text-teal-900">
                            <input type="checkbox" checked={Boolean(includedTravel[billingService.id])} onChange={(event) => setIncludedTravel((current) => ({ ...current, [billingService.id]: event.target.checked }))} />
                            Include on invoice
                          </label>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <BillingField label="Odometer start" type="number" value={travel.odometerStart} onChange={(value) => updateTravelDraft(billingService.id, "odometerStart", value)} />
                          <BillingField label="Odometer end" type="number" value={travel.odometerEnd} onChange={(value) => updateTravelDraft(billingService.id, "odometerEnd", value)} />
                          <BillingField label="Agreed rate per km" type="number" value={travel.rate} onChange={(value) => updateTravelDraft(billingService.id, "rate", value)} />
                          <BillingField label="Travel support item" value={travel.supportItemNumber} onChange={(value) => updateTravelDraft(billingService.id, "supportItemNumber", value)} />
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                          <BillingField label="Travel notes" value={travel.notes} onChange={(value) => updateTravelDraft(billingService.id, "notes", value)} />
                          <button type="button" onClick={() => void saveTravelEvidence(billingService.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900">
                            <Save size={16} aria-hidden="true" /> Save {distance.toFixed(1)} km
                          </button>
                        </div>
                      </div>
                    );
                  })() : null}
                  {billingService && !invoiceEligibility.allowed ? <p className="mt-3 text-sm font-semibold text-red-700">{invoiceEligibility.reason}</p> : null}
                </div>
              );
            })}
          </div>
          <button type="button" disabled={creatingInvoiceId === "batch" || !Object.values(selectedInvoiceServices).some(Boolean)} onClick={() => void generateHolisticInvoice()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            <ReceiptText size={17} aria-hidden="true" />{creatingInvoiceId === "batch" ? "Creating invoice..." : `Create participant invoice (${Object.values(selectedInvoiceServices).filter(Boolean).length})`}
          </button>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-ink">4. Invoices</h2>
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
                  <div className="mt-3 hidden overflow-x-auto rounded-md border border-slate-200 md:block">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Support</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Rate</th><th className="px-3 py-2">Amount</th></tr></thead>
                      <tbody>
                        {lines.map((line) => <tr key={line.id} className="border-t border-slate-200"><td className="px-3 py-2">{line.serviceDate}</td><td className="px-3 py-2 font-semibold text-ink">{line.supportItemNumber}</td><td className="px-3 py-2">{line.quantity} {line.unitType}</td><td className="px-3 py-2">${line.rate.toFixed(2)}</td><td className="px-3 py-2 font-semibold text-ink">${line.amount.toFixed(2)}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 grid gap-2 md:hidden">
                    {lines.map((line) => <div key={`${line.id}-mobile`} className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                      <div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words font-semibold text-ink">{line.supportItemNumber || "Support"}</p><p className="shrink-0 font-bold text-ink">${line.amount.toFixed(2)}</p></div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600"><span>{line.serviceDate}</span><span>{line.quantity} {line.unitType} x ${line.rate.toFixed(2)}</span><span>GST: {line.gstCode || "Not specified"}</span></div>
                    </div>)}
                  </div>
                  {lines.filter((line) => line.exceptionReason).map((line) => <p key={`${line.id}-warning`} className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{line.supportItemNumber}: {line.exceptionReason}</p>)}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void exportInvoice(invoice, lines)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"><FileDown size={16} /> Download PDF + CSV</button>
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

function downloadBlob(filename: string, blob: Blob) {
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

function getDefaultRateDraft(): ServiceRateDraft {
  return { source: "ndis_catalogue", itemId: "", manualCode: "", manualRate: "", manualUnit: "hour", approved: false };
}

function getSuggestedRateDraft(service: NativeBillingRecords["shifts"][number], records: NativeBillingRecords): ServiceRateDraft {
  const agreementItems = records.agreementItems.filter((item) => item.serviceAgreementId === service.serviceAgreementId && item.status === "active");
  const ndisMatch = matchNdisSupportItems(service, records.supportItems, records.pricingVersions)[0]?.item;
  const agreementMatch = agreementItems.find((item) => item.supportItemId && item.supportItemId === ndisMatch?.id)
    || agreementItems.find((item) => textMatchScore(`${service.supportType} ${service.title}`, `${item.supportItemNumber} ${item.supportItemName}`) > 0)
    || agreementItems[0];
  if (agreementMatch) return { ...getDefaultRateDraft(), source: "service_agreement", itemId: agreementMatch.id };
  if (ndisMatch) return { ...getDefaultRateDraft(), itemId: ndisMatch.id };
  return getDefaultRateDraft();
}

function findAgreementNdisMatch(code: string, name: string, records: NativeBillingRecords) {
  const activeItems = records.supportItems.filter((item) => item.priceLimit !== null);
  const exact = activeItems.find((item) => code.trim() && item.supportItemNumber.toLowerCase() === code.trim().toLowerCase());
  if (exact) return exact;
  const ranked = activeItems
    .map((item) => ({ item, score: textMatchScore(`${code} ${name}`, `${item.supportItemNumber} ${item.supportItemName}`) }))
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.score > 0 ? ranked[0].item : undefined;
}

function textMatchScore(left: string, right: string) {
  const words = (value: string) => new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2));
  const leftWords = words(left);
  return [...words(right)].filter((word) => leftWords.has(word)).length;
}

function getRatioStaffCount(ratio?: string) {
  const match = ratio?.trim().match(/^(\d+)\s*:\s*1$/);
  return match ? Number(match[1]) : 0;
}

function formatServiceHours(start: string, end: string) {
  return Math.max(0, Math.round(((new Date(end).getTime() - new Date(start).getTime()) / 3_600_000) * 100) / 100);
}
