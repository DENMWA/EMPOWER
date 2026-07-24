import type { ClientRecord } from "@/lib/client-records";
import type { RetainedRecord } from "@/lib/retained-records";
import type { StaffRecord } from "@/lib/staff-records";

export type ShiftStatus = "draft" | "scheduled" | "completed" | "cancelled" | "no_show" | "missed" | "archived";
export type PricingVersionStatus = "draft" | "active" | "superseded" | "archived" | "failed";
export type AgreementStatus = "draft" | "active" | "expired" | "superseded" | "archived";
export type InvoiceStatus = "draft" | "review_required" | "approved" | "sent" | "paid" | "void";
export type PaymentStatus = "unpaid" | "part_paid" | "paid" | "overdue";
export type PriceCheckStatus = "within_limit" | "over_limit" | "not_applicable" | "manual_review_required";
export type EvidenceStatus = "evidence_linked" | "missing_note" | "review_required" | "approved";

export type SupportShift = {
  id: string;
  participantId: string;
  participantName: string;
  staffId: string;
  staffName: string;
  serviceAgreementId: string;
  title: string;
  supportType: string;
  location: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  recurrenceRule: string;
  cancellationReason?: string;
  billableCancellation?: boolean;
  noteRecordId?: string;
  createdAt: string;
};

export type NdisPricingVersion = {
  id: string;
  versionName: string;
  effectiveFrom: string;
  effectiveTo: string;
  sourceName: string;
  sourceUrl: string;
  sourceFilename: string;
  importMethod: "manual" | "automatic_ndia_source" | "api" | "seed";
  status: PricingVersionStatus;
  importedAt: string;
  reviewedAt?: string;
  activatedAt?: string;
  validationWarnings: string[];
};

export type NdisSupportItem = {
  id: string;
  pricingVersionId: string;
  supportItemNumber: string;
  supportItemName: string;
  registrationGroup: string;
  supportCategory: string;
  unitType: string;
  claimType: string;
  priceLimit: number | null;
  gstCode: string;
  effectiveFrom: string;
  effectiveTo: string;
};

export type ServiceAgreement = {
  id: string;
  participantId: string;
  participantName: string;
  agreementName: string;
  startDate: string;
  endDate: string;
  billingFrequency: "daily" | "weekly" | "fortnightly" | "monthly" | "custom";
  invoiceRecipientType: "self_managed" | "plan_managed" | "agency_managed" | "other";
  invoiceRecipientName: string;
  invoiceRecipientEmail: string;
  planManagerName: string;
  planManagerEmail: string;
  status: AgreementStatus;
  createdAt: string;
};

export type ServiceAgreementItem = {
  id: string;
  serviceAgreementId: string;
  participantId: string;
  supportItemId: string;
  pricingVersionId: string;
  supportItemNumber: string;
  supportItemName: string;
  agreedRate: number;
  ndisPriceLimit: number | null;
  unitType: string;
  budgetCategory: string;
  budgetAllocated: number;
  allowTravel: boolean;
  allowKilometres: boolean;
  allowNonFaceToFace: boolean;
  allowCancellations: boolean;
  status: "active" | "archived";
};

export type NativeInvoice = {
  id: string;
  invoiceNumber: string;
  participantId: string;
  participantName: string;
  recipientName: string;
  recipientEmail: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  createdAt: string;
};

export type NativeInvoiceLine = {
  id: string;
  invoiceId: string;
  shiftId: string;
  serviceAgreementId: string;
  serviceAgreementItemId: string;
  participantId: string;
  serviceDate: string;
  supportItemNumber: string;
  supportItemName: string;
  description: string;
  quantity: number;
  unitType: string;
  rate: number;
  amount: number;
  gstCode: string;
  pricingVersionId: string;
  pricingVersionName: string;
  ndisPriceLimitUsed: number | null;
  agreedRateUsed: number;
  evidenceStatus: EvidenceStatus;
  priceCheckStatus: PriceCheckStatus;
  approvalStatus: "draft" | "approved" | "needs_correction";
  exceptionReason: string;
  noteReference: string;
};

export type NativeBillingRecords = {
  shifts: SupportShift[];
  pricingVersions: NdisPricingVersion[];
  supportItems: NdisSupportItem[];
  agreements: ServiceAgreement[];
  agreementItems: ServiceAgreementItem[];
  invoices: NativeInvoice[];
  invoiceLines: NativeInvoiceLine[];
};

const storageKey = "empowernotes:native-billing-records";
export const nativeBillingUpdatedEvent = "empowernotes:native-billing-updated";

export function getNativeBillingRecords(): NativeBillingRecords {
  if (typeof window === "undefined") return getEmptyBillingRecords();

  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? { ...getEmptyBillingRecords(), ...JSON.parse(stored) as NativeBillingRecords } : getEmptyBillingRecords();
  } catch {
    return getEmptyBillingRecords();
  }
}

export function saveNativeBillingRecords(records: NativeBillingRecords) {
  window.localStorage.setItem(storageKey, JSON.stringify(records));
  window.dispatchEvent(new Event(nativeBillingUpdatedEvent));
}

export function createPricingVersionFromManualUpload(input: { versionName: string; effectiveFrom: string; sourceFilename: string }) {
  const version: NdisPricingVersion = {
    id: createId("pricing-version"),
    versionName: input.versionName || "Manual NDIS pricing upload",
    effectiveFrom: input.effectiveFrom,
    effectiveTo: "",
    sourceName: "Admin manual upload",
    sourceUrl: "",
    sourceFilename: input.sourceFilename || "manual-upload.csv",
    importMethod: "manual",
    status: "draft",
    importedAt: new Date().toISOString(),
    validationWarnings: ["This pricing version was imported from the selected NDIA source. Please review and confirm before activation."]
  };

  const supportItems = getStarterSupportItems(version.id, version.effectiveFrom);
  const records = getNativeBillingRecords();
  saveNativeBillingRecords({
    ...records,
    pricingVersions: [version, ...records.pricingVersions],
    supportItems: [...supportItems, ...records.supportItems]
  });
  return version;
}

export function activatePricingVersion(versionId: string) {
  const records = getNativeBillingRecords();
  saveNativeBillingRecords({
    ...records,
    pricingVersions: records.pricingVersions.map((version) => {
      if (version.id === versionId) return { ...version, status: "active", reviewedAt: new Date().toISOString(), activatedAt: new Date().toISOString() };
      if (version.status === "active") return { ...version, status: "superseded" };
      return version;
    })
  });
}

export function createServiceAgreement(input: {
  participant: ClientRecord;
  agreementName: string;
  startDate: string;
  endDate: string;
  billingFrequency: ServiceAgreement["billingFrequency"];
  recipientName: string;
  recipientEmail: string;
}) {
  const agreement: ServiceAgreement = {
    id: createId("agreement"),
    participantId: input.participant.id,
    participantName: input.participant.name,
    agreementName: input.agreementName || `${input.participant.name} service agreement`,
    startDate: input.startDate,
    endDate: input.endDate,
    billingFrequency: input.billingFrequency,
    invoiceRecipientType: "plan_managed",
    invoiceRecipientName: input.recipientName || input.participant.name,
    invoiceRecipientEmail: input.recipientEmail,
    planManagerName: input.recipientName,
    planManagerEmail: input.recipientEmail,
    status: "active",
    createdAt: new Date().toISOString()
  };
  const records = getNativeBillingRecords();
  saveNativeBillingRecords({ ...records, agreements: [agreement, ...records.agreements] });
  return agreement;
}

export function addServiceAgreementItem(input: {
  agreement: ServiceAgreement;
  supportItem: NdisSupportItem;
  pricingVersion: NdisPricingVersion;
  agreedRate: number;
  budgetAllocated: number;
  allowCancellations: boolean;
}) {
  const item: ServiceAgreementItem = {
    id: createId("agreement-item"),
    serviceAgreementId: input.agreement.id,
    participantId: input.agreement.participantId,
    supportItemId: input.supportItem.id,
    pricingVersionId: input.pricingVersion.id,
    supportItemNumber: input.supportItem.supportItemNumber,
    supportItemName: input.supportItem.supportItemName,
    agreedRate: input.agreedRate,
    ndisPriceLimit: input.supportItem.priceLimit,
    unitType: input.supportItem.unitType,
    budgetCategory: input.supportItem.supportCategory || "Core",
    budgetAllocated: input.budgetAllocated,
    allowTravel: false,
    allowKilometres: false,
    allowNonFaceToFace: false,
    allowCancellations: input.allowCancellations,
    status: "active"
  };
  const records = getNativeBillingRecords();
  saveNativeBillingRecords({ ...records, agreementItems: [item, ...records.agreementItems] });
  return item;
}

export function createSupportShift(input: {
  participant: ClientRecord;
  staff: StaffRecord | undefined;
  agreement: ServiceAgreement;
  title: string;
  supportType: string;
  location: string;
  startTime: string;
  endTime: string;
}) {
  const shift: SupportShift = {
    id: createId("shift"),
    participantId: input.participant.id,
    participantName: input.participant.name,
    staffId: input.staff?.id || "",
    staffName: input.staff?.name || "Unassigned staff",
    serviceAgreementId: input.agreement.id,
    title: input.title || input.supportType,
    supportType: input.supportType,
    location: input.location,
    startTime: input.startTime,
    endTime: input.endTime,
    status: "scheduled",
    recurrenceRule: "",
    createdAt: new Date().toISOString()
  };
  const records = getNativeBillingRecords();
  saveNativeBillingRecords({ ...records, shifts: [shift, ...records.shifts] });
  return shift;
}

export function completeShift(shiftId: string, noteRecordId: string) {
  const records = getNativeBillingRecords();
  saveNativeBillingRecords({
    ...records,
    shifts: records.shifts.map((shift) => shift.id === shiftId ? { ...shift, status: "completed", noteRecordId } : shift)
  });
}

export function createInvoiceFromShift(shiftId: string, notes: RetainedRecord[]) {
  const records = getNativeBillingRecords();
  const shift = records.shifts.find((item) => item.id === shiftId);
  if (!shift) return { invoice: null, lines: [], error: "Shift not found." };
  const agreement = records.agreements.find((item) => item.id === shift.serviceAgreementId);
  if (!agreement) return { invoice: null, lines: [], error: "Service agreement not found." };
  const agreementItem = records.agreementItems.find((item) => item.serviceAgreementId === agreement.id && item.status === "active");
  if (!agreementItem) return { invoice: null, lines: [], error: "Add a service agreement item before invoicing." };
  const pricingVersion = records.pricingVersions.find((item) => item.id === agreementItem.pricingVersionId);
  const quantity = Math.max(0.25, getHoursBetween(shift.startTime, shift.endTime));
  const evidenceStatus = getEvidenceStatus(shift, notes);
  const priceCheckStatus = getPriceCheckStatus(agreementItem.agreedRate, agreementItem.ndisPriceLimit);
  const duplicate = records.invoiceLines.some((line) => line.shiftId === shift.id && line.approvalStatus !== "needs_correction");
  const serviceDate = shift.startTime.slice(0, 10);
  const agreementWarning = isServiceDateInsideAgreement(serviceDate, agreement) ? "" : "Service date is outside service agreement dates";
  const exceptionReason = [
    duplicate && "Possible duplicate billing detected",
    evidenceStatus === "missing_note" && "Completed shift has no linked support note",
    priceCheckStatus === "over_limit" && "Agreed rate is above selected NDIS price limit",
    priceCheckStatus === "manual_review_required" && "Pricing version or price limit requires review",
    agreementWarning
  ].filter(Boolean).join("; ");

  const invoice: NativeInvoice = {
    id: createId("invoice"),
    invoiceNumber: `EN-${new Date().getFullYear()}-${String(records.invoices.length + 1).padStart(5, "0")}`,
    participantId: shift.participantId,
    participantName: shift.participantName,
    recipientName: agreement.invoiceRecipientName,
    recipientEmail: agreement.invoiceRecipientEmail,
    billingPeriodStart: serviceDate,
    billingPeriodEnd: serviceDate,
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: addDays(new Date(), 14).toISOString().slice(0, 10),
    status: exceptionReason ? "review_required" : "draft",
    paymentStatus: "unpaid",
    totalAmount: roundCurrency(quantity * agreementItem.agreedRate),
    createdAt: new Date().toISOString()
  };

  const line: NativeInvoiceLine = {
    id: createId("invoice-line"),
    invoiceId: invoice.id,
    shiftId: shift.id,
    serviceAgreementId: agreement.id,
    serviceAgreementItemId: agreementItem.id,
    participantId: shift.participantId,
    serviceDate,
    supportItemNumber: agreementItem.supportItemNumber,
    supportItemName: agreementItem.supportItemName,
    description: `${shift.supportType} at ${shift.location || "support location"}`,
    quantity,
    unitType: agreementItem.unitType,
    rate: agreementItem.agreedRate,
    amount: invoice.totalAmount,
    gstCode: "GST-free",
    pricingVersionId: agreementItem.pricingVersionId,
    pricingVersionName: pricingVersion?.versionName || "Missing pricing version",
    ndisPriceLimitUsed: agreementItem.ndisPriceLimit,
    agreedRateUsed: agreementItem.agreedRate,
    evidenceStatus,
    priceCheckStatus,
    approvalStatus: exceptionReason ? "needs_correction" : "draft",
    exceptionReason,
    noteReference: shift.noteRecordId || "No support note linked"
  };

  saveNativeBillingRecords({
    ...records,
    invoices: [invoice, ...records.invoices],
    invoiceLines: [line, ...records.invoiceLines]
  });

  return { invoice, lines: [line], error: "" };
}

export function markInvoicePaymentStatus(invoiceId: string, paymentStatus: PaymentStatus) {
  const records = getNativeBillingRecords();
  saveNativeBillingRecords({
    ...records,
    invoices: records.invoices.map((invoice) => invoice.id === invoiceId ? { ...invoice, paymentStatus, status: paymentStatus === "paid" ? "paid" : invoice.status } : invoice)
  });
}

export function getBudgetUsage(records: NativeBillingRecords, participantId: string) {
  return records.agreementItems
    .filter((item) => item.participantId === participantId)
    .map((item) => {
      const used = records.invoiceLines
        .filter((line) => line.serviceAgreementItemId === item.id)
        .reduce((total, line) => total + line.amount, 0);
      const usedPercent = item.budgetAllocated ? Math.round((used / item.budgetAllocated) * 100) : 0;
      return {
        category: item.budgetCategory,
        allocated: item.budgetAllocated,
        used,
        remaining: item.budgetAllocated - used,
        usedPercent,
        warning: usedPercent >= 100 ? "Budget exceeded" : usedPercent >= 90 ? "90% budget used" : usedPercent >= 75 ? "75% budget used" : "Within budget"
      };
    });
}

export function buildInvoiceCsv(invoice: NativeInvoice, lines: NativeInvoiceLine[]) {
  const headers = ["invoice_number", "invoice_date", "participant_name", "recipient_name", "service_date", "support_item_number", "support_item_name", "description", "quantity", "unit_type", "rate", "amount", "gst_code", "pricing_version", "evidence_status", "approval_status", "payment_status"];
  const rows = lines.map((line) => [
    invoice.invoiceNumber,
    invoice.invoiceDate,
    invoice.participantName,
    invoice.recipientName,
    line.serviceDate,
    line.supportItemNumber,
    line.supportItemName,
    line.description,
    String(line.quantity),
    line.unitType,
    String(line.rate),
    String(line.amount),
    line.gstCode,
    line.pricingVersionName,
    line.evidenceStatus,
    line.approvalStatus,
    invoice.paymentStatus
  ]);
  return [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, "\"\"")}"`).join(",")).join("\n");
}

export function getEmptyBillingRecords(): NativeBillingRecords {
  return { shifts: [], pricingVersions: [], supportItems: [], agreements: [], agreementItems: [], invoices: [], invoiceLines: [] };
}

function getStarterSupportItems(pricingVersionId: string, effectiveFrom: string): NdisSupportItem[] {
  return [
    {
      id: createId("support-item"),
      pricingVersionId,
      supportItemNumber: "MANUAL-CORE-HOUR",
      supportItemName: "Manual support item - hourly direct support",
      registrationGroup: "Manual import placeholder",
      supportCategory: "Core supports",
      unitType: "hour",
      claimType: "standard",
      priceLimit: 70,
      gstCode: "GST-free",
      effectiveFrom,
      effectiveTo: ""
    },
    {
      id: createId("support-item"),
      pricingVersionId,
      supportItemNumber: "MANUAL-CANCEL",
      supportItemName: "Manual support item - cancellation billing review",
      registrationGroup: "Manual import placeholder",
      supportCategory: "Core supports",
      unitType: "each",
      claimType: "cancellation",
      priceLimit: null,
      gstCode: "GST-free",
      effectiveFrom,
      effectiveTo: ""
    }
  ];
}

function getPriceCheckStatus(agreedRate: number, priceLimit: number | null): PriceCheckStatus {
  if (priceLimit === null) return "manual_review_required";
  return agreedRate <= priceLimit ? "within_limit" : "over_limit";
}

function getEvidenceStatus(shift: SupportShift, notes: RetainedRecord[]): EvidenceStatus {
  if (!shift.noteRecordId) return "missing_note";
  return notes.some((note) => note.id === shift.noteRecordId) ? "evidence_linked" : "review_required";
}

function isServiceDateInsideAgreement(serviceDate: string, agreement: ServiceAgreement) {
  return serviceDate >= agreement.startDate && (!agreement.endDate || serviceDate <= agreement.endDate);
}

function getHoursBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function createId(prefix: string) {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
