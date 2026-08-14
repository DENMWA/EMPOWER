"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, FileDown, Plus, ReceiptText, Save, ShieldAlert } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { ClientIdentity } from "@/components/participants/PrivateClientPhoto";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";
import { getTenantStaffInvites } from "@/lib/staff-records";
import {
  addManualServiceAgreementItem,
  addServiceAgreementItem,
  buildInvoiceCsv,
  createInvoiceFromServices,
  createServiceAgreement,
  getBudgetUsage,
  getInvoiceEligibility,
  getBillableQuantity,
  matchNdisSupportItems,
  getNativeBillingRecords,
  reconcileCompletedRosterServices,
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
import { getTenantDocumentRecords, type StoredDocumentRecord } from "@/lib/document-records";

type TravelDraft = { odometerStart: string; odometerEnd: string; rate: string; supportItemNumber: string; notes: string };
type ServiceRateDraft = { source: InvoiceRateSource; itemId: string; ndisSupportItemId: string; manualRate: string; manualUnit: string; approved: boolean };
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
  const [showBillingSetup, setShowBillingSetup] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [savingAction, setSavingAction] = useState<"agreement" | "item" | "">("");
  const [creatingInvoiceId, setCreatingInvoiceId] = useState("");
  const [invoicePeriodStart, setInvoicePeriodStart] = useState(() => `${new Date().toISOString().slice(0, 7)}-01`);
  const [invoicePeriodEnd, setInvoicePeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedInvoiceServices, setSelectedInvoiceServices] = useState<Record<string, boolean>>({});
  const [serviceRateDrafts, setServiceRateDrafts] = useState<Record<string, ServiceRateDraft>>({});
  const [servicePricingSearches, setServicePricingSearches] = useState<Record<string, string>>({});
  const [includedTravel, setIncludedTravel] = useState<Record<string, boolean>>({});
  const [travelDrafts, setTravelDrafts] = useState<Record<string, TravelDraft>>({});
  const [vaultAgreements, setVaultAgreements] = useState<StoredDocumentRecord[]>([]);
  const [agreementDraftItems, setAgreementDraftItems] = useState<AgreementDraftItem[]>([]);
  const [agreementSourceFile, setAgreementSourceFile] = useState("");
  const [catalogueFile, setCatalogueFile] = useState<File | null>(null);
  const [catalogueEffectiveFrom, setCatalogueEffectiveFrom] = useState("");
  const [importingCatalogue, setImportingCatalogue] = useState(false);
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
  const clientInvoices = selectedClient ? records.invoices.filter((invoice) => invoice.participantId === selectedClient.id) : [];
  const clientInvoiceIds = new Set(clientInvoices.map((invoice) => invoice.id));
  const exceptionLines = records.invoiceLines.filter((line) => line.exceptionReason && clientInvoiceIds.has(line.invoiceId));
  const deliveredServices = selectedClient ? records.shifts.filter((service) =>
    service.participantId === selectedClient.id
      && service.status === "completed"
      && service.startTime.slice(0, 10) >= invoicePeriodStart
      && service.startTime.slice(0, 10) <= invoicePeriodEnd
  ).sort((left, right) => left.startTime.localeCompare(right.startTime)) : [];
  const deliveredHours = deliveredServices.reduce((total, service) => total + formatServiceHours(service.startTime, service.endTime), 0);
  const invoiceServiceRows: RosterShift[] = deliveredServices.map((service) => rosterServices.find((shift) => shift.id === service.rosterShiftId) || {
    id: service.rosterShiftId || service.id,
    participantId: service.participantId,
    participantName: service.participantName,
    workerId: service.staffId,
    workerName: service.staffName,
    supportType: service.supportType,
    shiftDate: service.startTime.slice(0, 10),
    startTime: formatServiceTime(service.startTime),
    endTime: formatServiceTime(service.endTime),
    location: service.location,
    shiftInstructions: "",
    status: "Completed",
    noteRequired: false,
    noteCompleted: Boolean(service.noteRecordId)
  });
  const invoicePreview = getInvoicePreview(records, selectedInvoiceServices, serviceRateDrafts, includedTravel);

  useEffect(() => {
    async function loadRecords() {
      const [clientItems, staffItems, noteItems, documentItems] = await Promise.all([
        getTenantClients(true).catch(() => []),
        getTenantStaffInvites().catch(() => []),
        getTenantRetainedRecords("progress-note").catch(() => []),
        getTenantDocumentRecords().catch(() => [])
      ]);
      setClients(clientItems);
      setNotes(noteItems);
      setVaultAgreements(documentItems.filter((document) => /service agreement|pricing agreement/i.test(document.type)));
      const rosterResult = await loadTenantRosterShifts();
      setRosterServices(rosterResult.shifts);
      const requestedClientId = new URLSearchParams(window.location.search).get("clientId") || "";
      setSelectedClientId((current) => current || clientItems.find((client) => client.id === requestedClientId)?.id || clientItems[0]?.id || "");
      const cloudRecords = await loadTenantNativeBillingRecords(clientItems, staffItems);
      const completedServices = rosterResult.shifts.filter((shift) => shift.status === "Completed" || shift.status === "Note Completed");
      const reconciliation = reconcileCompletedRosterServices(completedServices.map((rosterShift) => ({
        rosterShift,
        agreement: cloudRecords.agreements.find((agreement) => agreement.participantId === rosterShift.participantId && agreement.status === "active"),
        noteRecordId: noteItems.find((note) => note.body.includes(rosterShift.participantName) || note.id.includes(rosterShift.participantId))?.id
      })), cloudRecords);
      setRecords(reconciliation.records);
      if (reconciliation.linked) {
        try {
          await waitForNativeBillingSave();
          setRecords(getNativeBillingRecords());
        } catch (error) {
          setMessage(`Some delivered services remain available locally while cloud sync retries. ${getBillingError(error)}`);
        }
      }
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

  function setBillingPeriod(preset: "daily" | "weekly" | "fortnightly" | "monthly") {
    const end = new Date();
    const start = new Date(end);
    if (preset === "weekly") start.setDate(end.getDate() - 6);
    if (preset === "fortnightly") start.setDate(end.getDate() - 13);
    if (preset === "monthly") start.setDate(1);
    setInvoicePeriodStart(start.toISOString().slice(0, 10));
    setInvoicePeriodEnd(end.toISOString().slice(0, 10));
  }

  useEffect(() => {
    const client = clients.find((item) => item.id === selectedClientId) || clients[0];
    setAgreementName(client ? `${client.name} NDIS service agreement` : "");
    setRecipientName(client?.name || "");
  }, [clients, selectedClientId]);

  useEffect(() => {
    const supportItem = supportItems.find((item) => item.id === selectedSupportItemId) || supportItems[0];
    if (!supportItem) return;
    setSelectedSupportItemId(supportItem.id);
    setAgreedRate(supportItem.priceLimit && supportItem.priceLimit > 0 ? String(supportItem.priceLimit) : "");
    const unit = supportItem.unitType.toLowerCase();
    setRatePeriod(unit.includes("week") ? "week" : unit.includes("month") ? "month" : "hour");
  }, [selectedSupportItemId, supportItems]);

  useEffect(() => {
    if (!records.shifts.length || !records.supportItems.length) return;
    setServiceRateDrafts((current) => {
      const next = { ...current };
      let changed = false;
      for (const service of records.shifts) {
        if (service.status !== "completed" || next[service.id]) continue;
        next[service.id] = getSuggestedRateDraft(service, records);
        changed = true;
      }
      return changed ? next : current;
    });
  }, [records]);

  async function importOfficialCatalogue() {
    const token = getStoredAccessToken();
    if (!catalogueFile || !catalogueEffectiveFrom || !token) {
      setMessage("Choose the official NDIA Support Catalogue CSV, its effective date, and sign in.");
      return;
    }
    setImportingCatalogue(true);
    setMessage("Validating the NDIA Support Catalogue...");
    try {
      const form = new FormData();
      form.append("file", catalogueFile);
      form.append("effectiveFrom", catalogueEffectiveFrom);
      const response = await fetch("/api/billing/import-ndis-catalogue", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const result = await response.json() as { error?: string; itemCount?: number };
      if (!response.ok) throw new Error(result.error || "The catalogue could not be imported.");
      const clientItems = clients.length ? clients : await getTenantClients(true);
      const staffItems = await getTenantStaffInvites();
      setRecords(await loadTenantNativeBillingRecords(clientItems, staffItems));
      setMessage(`${result.itemCount || 0} official catalogue price rows imported as a draft. Review and activate the version before invoice use.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The catalogue could not be imported.");
    } finally {
      setImportingCatalogue(false);
    }
  }

  async function activateDraft(versionId: string) {
    const token = getStoredAccessToken();
    if (!token) return setMessage("Sign in before activating NDIS pricing.");
    const response = await fetch("/api/billing/import-ndis-catalogue", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ versionId }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) return setMessage(result.error || "The catalogue could not be activated.");
    const staffItems = await getTenantStaffInvites();
    setRecords(await loadTenantNativeBillingRecords(clients, staffItems));
    setMessage("Official NDIS pricing activated. Invoice recommendations now use this catalogue by service date.");
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

  function loadVaultAgreement(document: StoredDocumentRecord) {
    try {
      const result = document.billingParsedTerms as Record<string, unknown> & { items?: Array<Record<string, unknown>> };
      if (!result?.items?.length) throw new Error(document.billingParseError || "This agreement has no extracted rates yet.");
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
      setAgreementSourceFile(document.fileName || document.type);
      if (typeof result.agreementName === "string" && result.agreementName) setAgreementName(result.agreementName);
      if (typeof result.startDate === "string" && result.startDate) setAgreementStartDate(result.startDate);
      if (typeof result.endDate === "string") setAgreementEndDate(result.endDate);
      if (typeof result.recipientName === "string") setRecipientName(result.recipientName);
      if (typeof result.recipientEmail === "string") setRecipientEmail(result.recipientEmail);
      setMessage(`${items.length} agreement rate${items.length === 1 ? "" : "s"} extracted. Review and edit before approval.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Agreement rates could not be loaded.");
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
          supportItemId: draft.ndisSupportItemId,
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

  async function exportInvoicePdf(invoice: NativeInvoice) {
    setMessage(`Preparing ${invoice.invoiceNumber}...`);
    const response = await fetch("/api/billing/invoice-pdf", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getStoredAccessToken()}` }, body: JSON.stringify({ invoiceId: invoice.id }) });
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { message?: string };
      setMessage(result.message || "The PDF could not be generated.");
      return;
    }
    downloadBlob(`${invoice.invoiceNumber}.pdf`, await response.blob());
    setMessage(`${invoice.invoiceNumber} downloaded as a secure A4 PDF.`);
  }

  function exportInvoiceCsv(invoice: NativeInvoice, lines: NativeInvoiceLine[]) {
    downloadCsv(`${invoice.invoiceNumber}.csv`, buildInvoiceCsv(invoice, lines));
    setMessage(`${invoice.invoiceNumber} downloaded as CSV.`);
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-100 bg-gradient-to-r from-white to-teal-50/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Invoice Workspace</h1>
            <p className="mt-1 text-sm text-slate-600">Create invoices from delivered supports.</p>
          </div>
          <StatusBadge label="NDIS aligned" tone="green" />
        </div>
      </Card>

      {message ? <div role="status" aria-live="polite" className="sticky top-3 z-20 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 shadow-sm">{message}</div> : null}

      <Card className="border-slate-200">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-end">
          <div>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Select client
            <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={selectedClient?.id || ""} onChange={(event) => setSelectedClientId(event.target.value)}>
              {!clients.length ? <option>Add a client first</option> : null}
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>
          </div>
          {selectedClient ? <div className="rounded-md border border-teal-100 bg-teal-50/40 p-3">
            <ClientIdentity client={selectedClient} detail={`Client No. ${formatClientNumber(selectedClient.id)} · ${selectedClient.primaryHouseName || selectedClient.serviceName || "No house assigned"}`} />
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge label={selectedAgreement ? "Active agreement" : "No active agreement"} tone={selectedAgreement ? "green" : "amber"} />
              <StatusBadge label={`${deliveredServices.length} delivered supports`} tone="blue" />
              <StatusBadge label={`${exceptionLines.length} exceptions`} tone={exceptionLines.length ? "amber" : "green"} />
            </div>
          </div> : null}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {showBillingSetup ? <Card className="order-3">
          <h2 className="text-xl font-semibold text-ink">1. Pricing</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">Official NDIS support catalogue<input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={(event) => setCatalogueFile(event.target.files?.[0] || null)} className="min-h-11 rounded-md border border-slate-300 bg-white p-2 font-normal" /></label>
            <BillingField label="Effective from" value={catalogueEffectiveFrom} onChange={setCatalogueEffectiveFrom} type="date" />
            <button type="button" disabled={importingCatalogue || !catalogueFile || !catalogueEffectiveFrom} onClick={() => void importOfficialCatalogue()} className="min-h-11 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:bg-slate-400">{importingCatalogue ? "Importing..." : "Import catalogue"}</button>
          </div>
          {draftPricingVersions.length ? <p className="mt-3 text-sm font-semibold text-amber-800">Imported drafts require review and activation before they can recommend invoice rates.</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">{draftPricingVersions.map((version) => <button key={version.id} type="button" onClick={() => void activateDraft(version.id)} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink">Activate {version.versionName}</button>)}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {records.pricingVersions.map((version) => <StatusBadge key={version.id} label={`${version.versionName} - ${version.status}`} tone={version.status === "active" ? "green" : version.status === "draft" ? "amber" : "blue"} />)}
          </div>
        </Card> : null}

        {showBillingSetup ? <Card className="order-4 xl:col-span-2">
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
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm" defaultValue="" onChange={(event) => {
                const document = vaultAgreements.find((item) => item.id === event.target.value);
                if (document) loadVaultAgreement(document);
              }}>
                <option value="">Choose a parsed Document Vault agreement</option>
                {vaultAgreements.filter((document) => document.participantId === selectedClient?.id).map((document) => (
                  <option key={document.id} value={document.id} disabled={document.billingParseStatus !== "ready"}>
                    {document.fileName || document.type} - {document.billingParseStatus === "ready" ? "ready for review" : document.billingParseStatus || "awaiting extraction"}
                  </option>
                ))}
              </select>
              <a href="/admin/documents" className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400">Open Document Vault</a>
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
        </Card> : null}

        <Card className="order-1 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">Delivered services</h2>
              <p className="mt-1 text-sm text-slate-600">Review delivered hours, choose a price, then create the invoice.</p>
            </div>
            <button type="button" onClick={() => setShowBillingSetup((current) => !current)} className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink">
              {showBillingSetup ? "Hide pricing and agreement" : "Manage pricing and agreement"}
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BillingField label="Billing period from" value={invoicePeriodStart} onChange={setInvoicePeriodStart} type="date" />
            <BillingField label="Billing period to" value={invoicePeriodEnd} onChange={setInvoicePeriodEnd} type="date" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Billing period presets">
            {([['daily', 'Today'], ['weekly', '7 days'], ['fortnightly', 'Fortnight'], ['monthly', 'This month']] as const).map(([preset, label]) => <button key={preset} type="button" onClick={() => setBillingPeriod(preset)} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-800">{label}</button>)}
          </div>
          <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${activePricingVersion ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            <span className="font-semibold">NDIS Pricing:</span> {activePricingVersion ? `${activePricingVersion.versionName} · effective ${activePricingVersion.effectiveFrom}` : "No active NDIS pricing version"}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <SummaryValue label="Services rendered" value={String(deliveredServices.length)} />
            <SummaryValue label="Hours delivered" value={formatQuantity(deliveredHours)} />
            <SummaryValue label="Client" value={selectedClient?.name || "None selected"} />
          </div>
          <div className="mt-4 space-y-3">
            {!invoiceServiceRows.length ? <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">No delivered services were recorded for this client in the selected period.</p> : null}
            {invoiceServiceRows.map((shift) => {
              const billingService = records.shifts.find((item) => item.rosterShiftId === shift.id || item.id === shift.id);
              const availableAgreementItems = billingService
                ? records.agreementItems.filter((item) => item.participantId === billingService.participantId && item.status === "active")
                : [];
              const ndisMatches = billingService ? matchNdisSupportItems(billingService, records.supportItems, records.pricingVersions) : [];
              const activeNdisItems = billingService ? getActiveNdisItemsForService(billingService, records) : [];
              const rateDraft = billingService ? serviceRateDrafts[billingService.id] || getSuggestedRateDraft(billingService, records) : getDefaultRateDraft();
              const agreementItem = rateDraft.source === "service_agreement" ? records.agreementItems.find((item) => item.id === rateDraft.itemId) : undefined;
              const selectedNdisItem = records.supportItems.find((item) => item.id === rateDraft.ndisSupportItemId);
              const assignedStaffCount = billingService ? Math.max(1, billingService.assignedStaffCount || 1) : 1;
              const expectedStaffCount = billingService ? getRatioStaffCount(billingService.staffingRatio) : 0;
              const ratioMismatch = Boolean(expectedStaffCount && expectedStaffCount !== assignedStaffCount);
              const selectedUnit = rateDraft.source === "ndis_catalogue"
                ? records.supportItems.find((item) => item.id === rateDraft.ndisSupportItemId)?.unitType
                : rateDraft.source === "service_agreement" ? agreementItem?.unitType : rateDraft.manualUnit;
              const billableQuantity = billingService && selectedUnit ? getBillableQuantity(billingService, selectedUnit) : 0;
              const invoiced = Boolean(billingService && records.invoiceLines.some((line) => line.shiftId === billingService.id && line.approvalStatus !== "needs_correction"));
              const invoiceEligibility = billingService && selectedAgreement
                ? getInvoiceEligibility(shift.shiftDate, selectedAgreement, selectedClient, `${shift.shiftDate}T${shift.startTime}:00`)
                : { allowed: true, reason: "" };
              const evidenceLinked = Boolean(billingService?.noteRecordId && notes.some((note) => note.id === billingService.noteRecordId));
              const selectedRate = rateDraft.source === "ndis_catalogue" ? selectedNdisItem?.priceLimit : rateDraft.source === "service_agreement" ? agreementItem?.agreedRate : Number(rateDraft.manualRate || 0);
              const hasValidSelectedRate = typeof selectedRate === "number" && Number.isFinite(selectedRate) && selectedRate > 0;
              const selectedLineTotal = hasValidSelectedRate ? Math.round(billableQuantity * selectedRate * 100) / 100 : null;
              const selectedSourceLabel = rateDraft.source === "ndis_catalogue" ? "NDIS guide" : rateDraft.source === "service_agreement" ? "Service agreement" : "Manual entry";
              const rateAboveLimit = rateDraft.source === "manual" && Boolean(selectedNdisItem?.priceLimit && selectedRate && selectedRate > selectedNdisItem.priceLimit);
              const pricingSearch = billingService ? servicePricingSearches[billingService.id] || "" : "";
              const visibleNdisItems = filterNdisItems(activeNdisItems, pricingSearch, selectedNdisItem?.id);
              return (
                <div key={shift.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold text-ink">{shift.shiftDate} - {shift.supportType}</p>
                  <p className="mt-1 text-sm text-slate-600">{shift.startTime}-{shift.endTime} - {shift.location} - {shift.assignedWorkers?.map((worker) => worker.name).join(", ") || shift.workerName}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className={`rounded-md px-2 py-1 ${evidenceLinked ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{evidenceLinked ? "Evidence linked" : "Evidence review required"}</span>
                    {billingService ? <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{formatServiceHours(billingService.startTime, billingService.endTime)} service hours</span> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {billingService ? (
                      <label className="flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink">
                        <input type="checkbox" disabled={invoiced || !invoiceEligibility.allowed} checked={Boolean(selectedInvoiceServices[billingService.id])} onChange={(event) => setSelectedInvoiceServices((current) => ({ ...current, [billingService.id]: event.target.checked }))} />
                        {invoiced ? "Already invoiced" : "Include in invoice"}
                      </label>
                    ) : <span className="inline-flex min-h-10 items-center rounded-md bg-slate-100 px-3 text-sm font-semibold text-slate-600">Preparing pricing options...</span>}
                  </div>
                  {billingService ? (
                    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-200 p-1" aria-label="Rate source">
                        {([['ndis_catalogue', 'NDIS guide'], ['service_agreement', 'Service agreement'], ['manual', 'Manual entry']] as const).map(([source, label]) => (
                          <button key={source} type="button" aria-pressed={rateDraft.source === source} disabled={source === "service_agreement" && !availableAgreementItems.length} onClick={() => {
                            const agreementRate = source === "service_agreement"
                              ? availableAgreementItems.find((item) => item.supportItemId === rateDraft.ndisSupportItemId) || availableAgreementItems[0]
                              : undefined;
                            setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...getDefaultRateDraft(), source, ndisSupportItemId: agreementRate?.supportItemId || rateDraft.ndisSupportItemId, itemId: source === "ndis_catalogue" ? rateDraft.ndisSupportItemId : agreementRate?.id || "" } }));
                          }} className={`min-h-10 rounded px-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${rateDraft.source === source ? 'bg-white text-ink shadow-sm' : 'text-slate-600'}`}>{label}</button>
                        ))}
                      </div>
                      <label className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
                        NDIS support item code
                        <input type="search" value={pricingSearch} onChange={(event) => setServicePricingSearches((current) => ({ ...current, [billingService.id]: event.target.value }))} placeholder="Search code, service or category" className="min-h-11 rounded-md border border-slate-300 bg-white px-3 font-normal text-ink" />
                        <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={rateDraft.ndisSupportItemId} onChange={(event) => setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...rateDraft, ndisSupportItemId: event.target.value, itemId: rateDraft.source === "ndis_catalogue" ? event.target.value : rateDraft.itemId, approved: false } }))}>
                          <option value="">Confirm the applicable NDIS code</option>
                          {visibleNdisItems.map((item) => <option key={item.id} value={item.id}>{item.supportItemNumber} - {item.supportItemName} - {formatPositiveRate(item.priceLimit)} / {item.unitType}{ndisMatches.some((match) => match.item.id === item.id) ? " - suggested" : ""}</option>)}
                        </select>
                        {selectedNdisItem ? <span className="font-normal text-teal-800">Suggested from {billingService.supportType}. Confirm before invoicing.</span> : null}
                        {!activeNdisItems.length ? <span className="font-normal text-amber-800">No active priced NDIS catalogue covers this service date. Import the official XLSX catalogue, review it, then activate it.</span> : null}
                        {activeNdisItems.length && !visibleNdisItems.length ? <span className="font-normal text-amber-800">No active support items match this search.</span> : null}
                      </label>
                      {rateAboveLimit ? <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">Rate exceeds selected NDIS price limit - review required.</p> : null}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-md border border-teal-200 bg-white p-3 text-sm">
                          <p className="font-semibold text-ink">NDIS advised rate</p>
                          <p className="mt-1 text-slate-700">{selectedNdisItem && selectedNdisItem.priceLimit && selectedNdisItem.priceLimit > 0 ? `${selectedNdisItem.supportItemNumber} · ${formatPositiveRate(selectedNdisItem.priceLimit)} / ${selectedNdisItem.unitType}` : "No priced catalogue match available"}</p>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                          <p className="font-semibold text-ink">Service agreement rate</p>
                          <p className="mt-1 text-slate-700">{agreementItem ? `${agreementItem.supportItemNumber} · $${agreementItem.agreedRate.toFixed(2)} / ${agreementItem.unitType}` : "No approved agreement rate selected"}</p>
                        </div>
                      </div>
                      {rateDraft.source === "service_agreement" ? (
                        <label className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
                          Agreed support code and rate
                          <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={rateDraft.itemId} onChange={(event) => {
                            const agreementRate = availableAgreementItems.find((item) => item.id === event.target.value);
                            setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...rateDraft, itemId: event.target.value, ndisSupportItemId: agreementRate?.supportItemId || rateDraft.ndisSupportItemId, approved: false } }));
                          }}>
                            <option value="">Select an agreed support</option>
                            {availableAgreementItems.map((item) => <option key={item.id} value={item.id}>{item.supportItemNumber} - ${item.agreedRate.toFixed(2)} / {item.unitType}</option>)}
                          </select>
                        </label>
                      ) : null}
                      {rateDraft.source === "manual" ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <BillingField label="Rate" type="number" value={rateDraft.manualRate} onChange={(value) => setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...rateDraft, manualRate: value, approved: false } }))} />
                          <label className="grid gap-2 text-sm font-semibold text-slate-700">Unit<select value={rateDraft.manualUnit} onChange={(event) => setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...rateDraft, manualUnit: event.target.value, approved: false } }))} className="min-h-11 rounded-md border border-slate-300 bg-white px-3"><option value="hour">Hour</option><option value="day">Day</option><option value="each">Each</option><option value="km">Kilometre</option></select></label>
                        </div>
                      ) : null}
                      <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${ratioMismatch ? "border-red-200 bg-red-50 text-red-800" : "border-teal-200 bg-teal-50 text-teal-900"}`}>
                        <p className="font-semibold">{billingService.staffingRatio || `${assignedStaffCount}:1`} support · {assignedStaffCount} assigned staff</p>
                        <p className="mt-1">{selectedUnit?.toLowerCase().includes("hour") && billableQuantity ? `${formatServiceHours(billingService.startTime, billingService.endTime)} service hours × ${assignedStaffCount} staff = ${billableQuantity} billable hours` : "Quantity is confirmed from the selected billing unit."}</p>
                        {ratioMismatch ? <p className="mt-1 font-semibold">The roster ratio and assigned staff do not match. Correct the roster before invoicing.</p> : null}
                      </div>
                      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
                        <p className="font-semibold text-ink">Selected price</p>
                        <p className="mt-1 text-slate-700">{selectedSourceLabel} · {hasValidSelectedRate ? `${formatMoney(selectedRate)} / ${selectedUnit || "unit"}` : "Price unavailable"}</p>
                        <p className="mt-1 font-semibold text-ink">{hasValidSelectedRate && selectedLineTotal !== null ? `${billableQuantity || 0} × ${formatMoney(selectedRate)} = ${formatMoney(selectedLineTotal)}` : "Choose a valid priced NDIS item, agreement rate, or manual rate."}</p>
                      </div>
                      <label className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" disabled={ratioMismatch || !selectedNdisItem || !hasValidSelectedRate || (rateDraft.source === "service_agreement" && !agreementItem)} checked={!ratioMismatch && hasValidSelectedRate && rateDraft.approved} onChange={(event) => setServiceRateDrafts((current) => ({ ...current, [billingService.id]: { ...rateDraft, approved: event.target.checked } }))} />{hasValidSelectedRate && selectedLineTotal !== null ? `I authorise ${selectedSourceLabel.toLowerCase()} pricing at ${formatMoney(selectedLineTotal)}` : `${selectedSourceLabel} price unavailable - authorization blocked`}</label>
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
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-ink">Invoice Summary</h3>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <SummaryValue label="Selected services" value={String(invoicePreview.serviceCount)} />
              <SummaryValue label="Billable quantity" value={formatQuantity(invoicePreview.quantity)} />
              <SummaryValue label="Subtotal" value={formatMoney(invoicePreview.subtotal)} />
              <SummaryValue label="GST" value={formatMoney(invoicePreview.gst)} />
              <SummaryValue label="Total" value={formatMoney(invoicePreview.total)} strong />
            </div>
          </div>
          {showInvoicePreview ? <div className="mt-4 rounded-md border border-teal-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-ink">Invoice preview</h3><StatusBadge label={invoicePreview.reviewCount ? `${invoicePreview.reviewCount} review item${invoicePreview.reviewCount === 1 ? "" : "s"}` : "Ready"} tone={invoicePreview.reviewCount ? "amber" : "green"} /></div>
            <div className="mt-3 space-y-2">
              {invoicePreview.lines.map((line) => <div key={line.shiftId} className="grid gap-1 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-[1fr_auto]">
                <div><p className="font-semibold text-ink">{line.date} · {line.code || "Support code required"}</p><p className="mt-1 text-slate-600">{line.quantity} {line.unit} · {line.source}</p></div>
                <p className="font-bold text-ink">{formatMoney(line.amount)}</p>
              </div>)}
              {!invoicePreview.lines.length ? <p className="text-sm text-slate-600">Choose delivered services to preview the invoice.</p> : null}
            </div>
          </div> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={!Object.values(selectedInvoiceServices).some(Boolean)} onClick={() => setShowInvoicePreview((current) => !current)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink disabled:bg-slate-100 disabled:text-slate-400"><Eye size={17} aria-hidden="true" />{showInvoicePreview ? "Hide Preview" : "Preview Invoice"}</button>
            <button type="button" disabled={creatingInvoiceId === "batch" || !Object.values(selectedInvoiceServices).some(Boolean)} onClick={() => void generateHolisticInvoice()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              <ReceiptText size={17} aria-hidden="true" />{creatingInvoiceId === "batch" ? "Generating invoice..." : `Generate invoice (${Object.values(selectedInvoiceServices).filter(Boolean).length})`}
            </button>
          </div>
        </Card>

        <details className="order-2 rounded-md border border-slate-200 bg-white p-4 xl:col-span-2">
          <summary className="cursor-pointer text-xl font-semibold text-ink">Invoice History</summary>
          <div className="mt-4 space-y-3">
            {!clientInvoices.length ? <p className="text-sm text-slate-600">No invoices have been created for this client.</p> : null}
            {clientInvoices.map((invoice) => {
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
                    <button type="button" onClick={() => void exportInvoicePdf(invoice)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"><FileDown size={16} /> Download PDF</button>
                    <button type="button" onClick={() => exportInvoiceCsv(invoice, lines)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"><FileDown size={16} /> Download CSV</button>
                    <button type="button" onClick={() => markInvoicePaymentStatus(invoice.id, "paid")} className="rounded-md border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700">Mark paid</button>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <details className="rounded-md border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold text-ink">Billing Exceptions {exceptionLines.length ? `(${exceptionLines.length})` : ""}</summary>
          <div className="mt-4">
            <h2 className="font-semibold text-ink">Billing exceptions</h2>
            <div className="mt-3 space-y-2">
              {!exceptionLines.length ? <p className="text-sm text-slate-600">No invoice exceptions for this client.</p> : null}
              {exceptionLines.map((line) => <p key={line.id} className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900"><ShieldAlert className="mr-2 inline" size={16} />{line.exceptionReason}</p>)}
            </div>
          </div>
        </details>
        {budgetRows.length ? <details className="rounded-md border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold text-ink">Budget Usage</summary>
          <div className="mt-4">
            <h2 className="font-semibold text-ink">Budget usage</h2>
            <div className="mt-3 space-y-2">
              {!budgetRows.length ? <p className="text-sm text-slate-600">No budget information available.</p> : null}
              {budgetRows.map((budget) => <p key={budget.category} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{budget.category}: ${budget.used} used of ${budget.allocated} - {budget.warning}</p>)}
            </div>
          </div>
        </details> : null}
      </div>

    </div>
  );
}

function formatClientNumber(id: string) {
  const compact = id.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `CL-${compact.slice(-6).padStart(6, "0")}`;
}

function SummaryValue({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="rounded-md bg-white p-3"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className={`mt-1 ${strong ? "text-lg font-bold text-teal-800" : "font-semibold text-ink"}`}>{value}</p></div>;
}

function getInvoicePreview(
  records: NativeBillingRecords,
  selectedServices: Record<string, boolean>,
  drafts: Record<string, ServiceRateDraft>,
  includedTravel: Record<string, boolean>
) {
  const lines = Object.entries(selectedServices).filter(([, selected]) => selected).flatMap(([shiftId]) => {
    const shift = records.shifts.find((item) => item.id === shiftId);
    if (!shift) return [];
    const draft = drafts[shiftId] || getSuggestedRateDraft(shift, records);
    const agreementItem = draft.source === "service_agreement" ? records.agreementItems.find((item) => item.id === draft.itemId) : undefined;
    const supportItem = records.supportItems.find((item) => item.id === draft.ndisSupportItemId);
    const code = supportItem?.supportItemNumber || "NDIS code required";
    const unit = draft.source === "service_agreement" ? agreementItem?.unitType : draft.source === "manual" ? draft.manualUnit : supportItem?.unitType;
    const rate = (draft.source === "service_agreement" ? agreementItem?.agreedRate : draft.source === "manual" ? Number(draft.manualRate || 0) : supportItem?.priceLimit) || 0;
    const quantity = unit ? getBillableQuantity(shift, unit) : 0;
    const ndisLimit = supportItem?.priceLimit ?? agreementItem?.ndisPriceLimit ?? null;
    const review = !draft.approved || !code || !rate || (draft.source === "manual" && ndisLimit !== null && rate > ndisLimit);
    const serviceLine = { shiftId, date: shift.startTime.slice(0, 10), code, quantity, unit, source: formatRateSource(draft.source), amount: Math.round(quantity * rate * 100) / 100, review };
    if (!includedTravel[shiftId] || !shift.travelKilometres || !shift.travelRatePerKilometre) return [serviceLine];
    return [serviceLine, { shiftId: `${shiftId}-travel`, date: shift.startTime.slice(0, 10), code: shift.travelSupportItemNumber || "Travel", quantity: shift.travelKilometres, unit: "km", source: "Service Agreement Rate", amount: Math.round(shift.travelKilometres * shift.travelRatePerKilometre * 100) / 100, review: true }];
  });
  const subtotal = Math.round(lines.reduce((total, line) => total + line.amount, 0) * 100) / 100;
  return { lines, serviceCount: Object.values(selectedServices).filter(Boolean).length, quantity: lines.reduce((total, line) => total + line.quantity, 0), subtotal, gst: 0, total: subtotal, reviewCount: lines.filter((line) => line.review).length };
}

function formatRateSource(source: InvoiceRateSource) {
  return source === "ndis_catalogue" ? "NDIS Price Limit" : source === "service_agreement" ? "Service Agreement Rate" : "Manual Rate";
}

function formatMoney(value: number) { return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value); }
function formatPositiveRate(value: number | null) { return value && value > 0 ? formatMoney(value) : "Price unavailable"; }
function formatQuantity(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(2); }

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
  return { source: "ndis_catalogue", itemId: "", ndisSupportItemId: "", manualRate: "", manualUnit: "hour", approved: false };
}

function getSuggestedRateDraft(service: NativeBillingRecords["shifts"][number], records: NativeBillingRecords): ServiceRateDraft {
  const agreementItems = records.agreementItems.filter((item) => item.participantId === service.participantId && item.status === "active");
  const ndisMatch = matchNdisSupportItems(service, records.supportItems, records.pricingVersions)[0]?.item;
  const agreementMatch = agreementItems.find((item) => item.supportItemId && item.supportItemId === ndisMatch?.id)
    || agreementItems.find((item) => textMatchScore(`${service.supportType} ${service.title}`, `${item.supportItemNumber} ${item.supportItemName}`) > 0)
    || agreementItems[0];
  if (agreementMatch) return { ...getDefaultRateDraft(), source: "service_agreement", itemId: agreementMatch.id, ndisSupportItemId: agreementMatch.supportItemId || ndisMatch?.id || "" };
  if (ndisMatch) return { ...getDefaultRateDraft(), itemId: ndisMatch.id, ndisSupportItemId: ndisMatch.id };
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

function getActiveNdisItemsForService(service: NativeBillingRecords["shifts"][number], records: NativeBillingRecords) {
  const serviceDate = service.startTime.slice(0, 10);
  const activeVersionIds = new Set(records.pricingVersions.filter((version) =>
    version.status === "active"
      && (!version.effectiveFrom || version.effectiveFrom <= serviceDate)
      && (!version.effectiveTo || version.effectiveTo >= serviceDate)
  ).map((version) => version.id));
  const suggestedOrder = new Map(matchNdisSupportItems(service, records.supportItems, records.pricingVersions).map((match, index) => [match.item.id, index]));
  return records.supportItems
    .filter((item) => activeVersionIds.has(item.pricingVersionId)
      && typeof item.priceLimit === "number"
      && item.priceLimit > 0
      && (!item.effectiveFrom || item.effectiveFrom <= serviceDate)
      && (!item.effectiveTo || item.effectiveTo >= serviceDate))
    .sort((left, right) => (suggestedOrder.get(left.id) ?? 999) - (suggestedOrder.get(right.id) ?? 999)
      || left.supportItemNumber.localeCompare(right.supportItemNumber));
}

function filterNdisItems(items: NativeBillingRecords["supportItems"], search: string, selectedId?: string) {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return items;
  return items.filter((item) => item.id === selectedId || terms.every((term) =>
    `${item.supportItemNumber} ${item.supportItemName} ${item.supportCategory} ${item.registrationGroup}`.toLowerCase().includes(term)
  ));
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

function formatServiceTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16);
  return date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
}
