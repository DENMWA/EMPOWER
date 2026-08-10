import { getStoredClients, type ClientRecord } from "@/lib/client-records";
import type { RetainedRecord } from "@/lib/retained-records";
import type { StaffRecord } from "@/lib/staff-records";
import type { RosterShift } from "@/lib/roster";
import { tenantStorageKey } from "@/lib/tenant-storage";

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
  rosterShiftId?: string;
  odometerStart?: number;
  odometerEnd?: number;
  travelKilometres?: number;
  travelRatePerKilometre?: number;
  travelSupportItemNumber?: string;
  travelNotes?: string;
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
  scope?: "platform" | "organisation";
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
  participantNdisNumber?: string;
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
let pendingCloudSave: Promise<unknown> = Promise.resolve();

export function getNativeBillingRecords(): NativeBillingRecords {
  if (typeof window === "undefined") return getEmptyBillingRecords();

  try {
    const stored = window.sessionStorage.getItem(tenantStorageKey(storageKey));
    return stored ? { ...getEmptyBillingRecords(), ...JSON.parse(stored) as NativeBillingRecords } : getEmptyBillingRecords();
  } catch {
    return getEmptyBillingRecords();
  }
}

export function saveNativeBillingRecords(records: NativeBillingRecords) {
  const previousRecords = getNativeBillingRecords();
  window.sessionStorage.setItem(tenantStorageKey(storageKey), JSON.stringify(records));
  window.dispatchEvent(new Event(nativeBillingUpdatedEvent));
  pendingCloudSave = import("@/lib/native-billing-cloud").then(({ queueNativeBillingCloudSync }) => queueNativeBillingCloudSync(records, previousRecords));
  return pendingCloudSave;
}

export function waitForNativeBillingSave() {
  return pendingCloudSave;
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
    validationWarnings: ["This pricing version was imported from the selected NDIA source. Please review and confirm before activation."],
    scope: "organisation"
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
      if (version.status === "active" && version.scope !== "platform") return { ...version, status: "superseded" };
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
  recipientType?: ServiceAgreement["invoiceRecipientType"];
  recipientName: string;
  recipientEmail: string;
  planManagerName?: string;
  planManagerEmail?: string;
}) {
  const agreement: ServiceAgreement = {
    id: createId("agreement"),
    participantId: input.participant.id,
    participantName: input.participant.name,
    agreementName: input.agreementName || `${input.participant.name} service agreement`,
    startDate: input.startDate,
    endDate: input.endDate,
    billingFrequency: input.billingFrequency,
    invoiceRecipientType: input.recipientType || "plan_managed",
    invoiceRecipientName: input.recipientName || input.participant.name,
    invoiceRecipientEmail: input.recipientEmail,
    planManagerName: input.planManagerName || input.recipientName,
    planManagerEmail: input.planManagerEmail || input.recipientEmail,
    status: "active",
    createdAt: new Date().toISOString()
  };
  const records = getNativeBillingRecords();
  const supersededAgreements = records.agreements.map((existing) =>
    existing.participantId === agreement.participantId && existing.status === "active"
      ? { ...existing, status: "superseded" as const }
      : existing
  );
  saveNativeBillingRecords({ ...records, agreements: [agreement, ...supersededAgreements] });
  return agreement;
}

export function addServiceAgreementItem(input: {
  agreement: ServiceAgreement;
  supportItem: NdisSupportItem;
  pricingVersion: NdisPricingVersion;
  agreedRate: number;
  ratePeriod?: "hour" | "day" | "week" | "month" | "each" | "km";
  budgetAllocated: number;
  allowTravel?: boolean;
  allowKilometres?: boolean;
  allowNonFaceToFace?: boolean;
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
    ndisPriceLimit: normaliseRatePeriod(input.supportItem.unitType) === input.ratePeriod ? input.supportItem.priceLimit : null,
    unitType: input.ratePeriod || normaliseRatePeriod(input.supportItem.unitType),
    budgetCategory: input.supportItem.supportCategory || "Core",
    budgetAllocated: input.budgetAllocated,
    allowTravel: Boolean(input.allowTravel),
    allowKilometres: Boolean(input.allowKilometres),
    allowNonFaceToFace: Boolean(input.allowNonFaceToFace),
    allowCancellations: input.allowCancellations,
    status: "active"
  };
  const records = getNativeBillingRecords();
  saveNativeBillingRecords({ ...records, agreementItems: [item, ...records.agreementItems] });
  return item;
}

export function addManualServiceAgreementItem(input: {
  agreement: ServiceAgreement;
  supportItemNumber: string;
  supportItemName: string;
  agreedRate: number;
  ratePeriod: "hour" | "day" | "week" | "month" | "each" | "km";
  budgetAllocated: number;
  allowTravel?: boolean;
  allowKilometres?: boolean;
  allowNonFaceToFace?: boolean;
  allowCancellations: boolean;
}) {
  const item: ServiceAgreementItem = {
    id: createId("agreement-item"),
    serviceAgreementId: input.agreement.id,
    participantId: input.agreement.participantId,
    supportItemId: "",
    pricingVersionId: "",
    supportItemNumber: input.supportItemNumber.trim() || "AGREED-SUPPORT",
    supportItemName: input.supportItemName.trim(),
    agreedRate: input.agreedRate,
    ndisPriceLimit: null,
    unitType: input.ratePeriod,
    budgetCategory: "Agreed supports",
    budgetAllocated: input.budgetAllocated,
    allowTravel: Boolean(input.allowTravel),
    allowKilometres: Boolean(input.allowKilometres),
    allowNonFaceToFace: Boolean(input.allowNonFaceToFace),
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

export function linkCompletedRosterService(input: {
  rosterShift: RosterShift;
  agreement: ServiceAgreement;
  noteRecordId?: string;
}) {
  const records = getNativeBillingRecords();
  const existing = records.shifts.find((shift) => shift.id === input.rosterShift.id || shift.rosterShiftId === input.rosterShift.id);
  if (existing?.serviceAgreementId) return { shift: existing, error: "This completed roster service is already linked to billing." };

  const assignedStaff = input.rosterShift.assignedWorkers?.length
    ? input.rosterShift.assignedWorkers
    : [{ id: input.rosterShift.workerId, name: input.rosterShift.workerName }];
  const shift: SupportShift = {
    id: input.rosterShift.id,
    rosterShiftId: input.rosterShift.id,
    participantId: input.rosterShift.participantId,
    participantName: input.rosterShift.participantName,
    staffId: assignedStaff[0]?.id || "",
    staffName: assignedStaff.map((worker) => worker.name).join(", "),
    serviceAgreementId: input.agreement.id,
    title: input.rosterShift.supportType,
    supportType: input.rosterShift.supportType,
    location: input.rosterShift.location,
    startTime: `${input.rosterShift.shiftDate}T${input.rosterShift.startTime}:00`,
    endTime: `${input.rosterShift.shiftDate}T${input.rosterShift.endTime}:00`,
    status: "completed",
    recurrenceRule: "",
    noteRecordId: input.noteRecordId,
    createdAt: new Date().toISOString()
  };

  saveNativeBillingRecords({
    ...records,
    shifts: existing
      ? records.shifts.map((item) => item.id === existing.id ? { ...item, ...shift } : item)
      : [shift, ...records.shifts]
  });
  return { shift, error: "" };
}

export function updateSupportShiftTravel(shiftId: string, input: {
  odometerStart: number;
  odometerEnd: number;
  ratePerKilometre: number;
  supportItemNumber: string;
  notes?: string;
}) {
  const records = getNativeBillingRecords();
  const shift = records.shifts.find((item) => item.id === shiftId);
  if (!shift) return { shift: null, error: "Completed service not found." };
  if (!Number.isFinite(input.odometerStart) || !Number.isFinite(input.odometerEnd) || input.odometerEnd < input.odometerStart) {
    return { shift: null, error: "Enter valid odometer readings. The end reading cannot be lower than the start reading." };
  }
  if (!Number.isFinite(input.ratePerKilometre) || input.ratePerKilometre <= 0) {
    return { shift: null, error: "Enter the participant-agreed kilometre rate." };
  }
  if (!input.supportItemNumber.trim()) return { shift: null, error: "Enter the applicable NDIS travel support item number." };

  const updatedShift: SupportShift = {
    ...shift,
    odometerStart: input.odometerStart,
    odometerEnd: input.odometerEnd,
    travelKilometres: Math.round((input.odometerEnd - input.odometerStart) * 10) / 10,
    travelRatePerKilometre: input.ratePerKilometre,
    travelSupportItemNumber: input.supportItemNumber.trim(),
    travelNotes: input.notes?.trim() || ""
  };
  saveNativeBillingRecords({
    ...records,
    shifts: records.shifts.map((item) => item.id === shiftId ? updatedShift : item)
  });
  return { shift: updatedShift, error: "" };
}

export function createInvoiceFromShift(shiftId: string, notes: RetainedRecord[], client?: ClientRecord) {
  const records = getNativeBillingRecords();
  const shift = records.shifts.find((item) => item.id === shiftId);
  if (!shift) return { invoice: null, lines: [], error: "Shift not found." };
  const agreement = records.agreements.find((item) => item.id === shift.serviceAgreementId);
  if (!agreement) return { invoice: null, lines: [], error: "Service agreement not found." };
  const agreementItem = records.agreementItems.find((item) => item.serviceAgreementId === agreement.id && item.status === "active");
  if (!agreementItem) return { invoice: null, lines: [], error: "Add a service agreement item before invoicing." };
  return createInvoiceFromServices([{ shiftId, agreementItemId: agreementItem.id }], notes, client);
}

export function createInvoiceFromServices(
  selections: Array<{ shiftId: string; agreementItemId: string; includeTravel?: boolean }>,
  notes: RetainedRecord[],
  client?: ClientRecord
) {
  const records = getNativeBillingRecords();
  if (!selections.length) return { invoice: null, lines: [], error: "Select at least one completed service." };

  const selected = selections.map((selection) => ({
    includeTravel: Boolean(selection.includeTravel),
    shift: records.shifts.find((item) => item.id === selection.shiftId),
    agreementItem: records.agreementItems.find((item) => item.id === selection.agreementItemId && item.status === "active")
  }));
  if (selected.some(({ shift }) => !shift)) return { invoice: null, lines: [], error: "One or more completed services could not be found." };
  if (selected.some(({ agreementItem }) => !agreementItem)) return { invoice: null, lines: [], error: "Choose an agreed support component for every selected service." };

  const shifts = selected.map(({ shift }) => shift as SupportShift);
  const participantId = shifts[0].participantId;
  if (shifts.some((shift) => shift.participantId !== participantId)) return { invoice: null, lines: [], error: "An invoice can only contain services for one participant." };
  const agreement = records.agreements.find((item) => item.id === shifts[0].serviceAgreementId);
  if (!agreement || shifts.some((shift) => shift.serviceAgreementId !== agreement.id)) return { invoice: null, lines: [], error: "Selected services must use the same active service agreement." };

  for (const { shift: possibleShift, agreementItem: possibleItem, includeTravel } of selected) {
    if (!includeTravel) continue;
    const shift = possibleShift as SupportShift;
    const agreementItem = possibleItem as ServiceAgreementItem;
    if (!agreementItem.allowTravel || !agreementItem.allowKilometres) {
      return { invoice: null, lines: [], error: "Travel and kilometres are not enabled for the selected agreed support component." };
    }
    if (!shift.travelKilometres || !shift.travelRatePerKilometre || !shift.travelSupportItemNumber) {
      return { invoice: null, lines: [], error: "Save the odometer readings, agreed kilometre rate and travel support item before including travel." };
    }
  }

  for (const shift of shifts) {
    const serviceDate = formatDateOnly(new Date(shift.startTime));
    const eligibility = getInvoiceEligibility(serviceDate, agreement, client, shift.startTime);
    if (!eligibility.allowed) return { invoice: null, lines: [], error: eligibility.reason };
  }

  const invoiceId = createId("invoice");
  const lines = selected.map(({ shift: possibleShift, agreementItem: possibleItem }) => {
    const shift = possibleShift as SupportShift;
    const agreementItem = possibleItem as ServiceAgreementItem;
    const serviceDate = formatDateOnly(new Date(shift.startTime));
    const pricingVersion = records.pricingVersions.find((item) => item.id === agreementItem.pricingVersionId);
    const quantity = agreementItem.unitType === "hour" ? Math.max(0.25, getHoursBetween(shift.startTime, shift.endTime)) : 1;
    const evidenceStatus = getEvidenceStatus(shift, notes);
    const priceCheckStatus = getPriceCheckStatus(agreementItem.agreedRate, agreementItem.ndisPriceLimit);
    const duplicate = records.invoiceLines.some((line) => line.shiftId === shift.id && line.approvalStatus !== "needs_correction");
    const missingNdisCode = !agreementItem.supportItemNumber || agreementItem.supportItemNumber === "AGREED-SUPPORT";
    const exceptionReason = [
      duplicate && "Possible duplicate billing detected",
      evidenceStatus === "missing_note" && "Completed shift has no linked support note",
      missingNdisCode && "NDIS support item number requires confirmation",
      priceCheckStatus === "over_limit" && "Agreed rate is above selected NDIS price limit",
      priceCheckStatus === "manual_review_required" && "Pricing version or price limit requires review"
    ].filter(Boolean).join("; ");
    const amount = roundCurrency(quantity * agreementItem.agreedRate);

    return {
      id: createId("invoice-line"),
      invoiceId,
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
      amount,
      gstCode: "GST-free",
      pricingVersionId: agreementItem.pricingVersionId,
      pricingVersionName: pricingVersion?.versionName || "Agreed service rate",
      ndisPriceLimitUsed: agreementItem.ndisPriceLimit,
      agreedRateUsed: agreementItem.agreedRate,
      evidenceStatus,
      priceCheckStatus,
      approvalStatus: exceptionReason ? "needs_correction" as const : "draft" as const,
      exceptionReason,
      noteReference: shift.noteRecordId || "No support note linked"
    };
  });

  selected.filter(({ includeTravel }) => includeTravel).forEach(({ shift: possibleShift, agreementItem: possibleItem }) => {
    const shift = possibleShift as SupportShift;
    const agreementItem = possibleItem as ServiceAgreementItem;
    if (!agreementItem.allowTravel || !agreementItem.allowKilometres) return;
    const kilometres = shift.travelKilometres || 0;
    const rate = shift.travelRatePerKilometre || 0;
    if (kilometres <= 0 || rate <= 0 || !shift.travelSupportItemNumber) return;
    lines.push({
      id: createId("invoice-line"),
      invoiceId,
      shiftId: shift.id,
      serviceAgreementId: agreement.id,
      serviceAgreementItemId: agreementItem.id,
      participantId: shift.participantId,
      serviceDate: formatDateOnly(new Date(shift.startTime)),
      supportItemNumber: shift.travelSupportItemNumber,
      supportItemName: "Provider travel - non-labour costs",
      description: `Travel evidence: odometer ${shift.odometerStart} to ${shift.odometerEnd} (${kilometres} km)${shift.travelNotes ? ` - ${shift.travelNotes}` : ""}`,
      quantity: kilometres,
      unitType: "km",
      rate,
      amount: roundCurrency(kilometres * rate),
      gstCode: "GST-free",
      pricingVersionId: agreementItem.pricingVersionId,
      pricingVersionName: "Participant-agreed travel rate",
      ndisPriceLimitUsed: null,
      agreedRateUsed: rate,
      evidenceStatus: getEvidenceStatus(shift, notes),
      priceCheckStatus: "manual_review_required",
      approvalStatus: "needs_correction",
      exceptionReason: "Confirm the category-specific NDIS travel support item and participant-agreed rate before issuing",
      noteReference: shift.noteRecordId || "No support note linked"
    });
  });

  const serviceDates = lines.map((line) => line.serviceDate).sort();
  const hasExceptions = lines.some((line) => line.exceptionReason);

  const invoice: NativeInvoice = {
    id: invoiceId,
    invoiceNumber: `EN-${new Date().getFullYear()}-${String(records.invoices.length + 1).padStart(5, "0")}`,
    participantId,
    participantName: shifts[0].participantName,
    participantNdisNumber: client?.ndisNumber || getStoredClients().find((item) => item.id === participantId)?.ndisNumber || "",
    recipientName: agreement.invoiceRecipientName,
    recipientEmail: agreement.invoiceRecipientEmail,
    billingPeriodStart: serviceDates[0],
    billingPeriodEnd: serviceDates[serviceDates.length - 1],
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: addDays(new Date(), 14).toISOString().slice(0, 10),
    status: hasExceptions ? "review_required" : "draft",
    paymentStatus: "unpaid",
    totalAmount: roundCurrency(lines.reduce((total, line) => total + line.amount, 0)),
    createdAt: new Date().toISOString()
  };

  saveNativeBillingRecords({
    ...records,
    invoices: [invoice, ...records.invoices],
    invoiceLines: [...lines, ...records.invoiceLines]
  });

  return { invoice, lines, error: "" };
}

export function getInvoiceEligibility(serviceDate: string, agreement: ServiceAgreement, client?: ClientRecord, serviceTimestamp?: string) {
  if (!isServiceDateInsideAgreement(serviceDate, agreement)) {
    return { allowed: false, reason: "Billing is disabled because the service date is outside the agreed service period." };
  }
  if (client?.status === "inactive") {
    const deactivatedAt = client.deactivatedAt || "";
    const deliveredAfterDeactivation = serviceTimestamp && deactivatedAt
      ? new Date(serviceTimestamp).getTime() > new Date(deactivatedAt).getTime()
      : !deactivatedAt || serviceDate > deactivatedAt.slice(0, 10);
    if (deliveredAfterDeactivation) {
      return { allowed: false, reason: "Billing is disabled for services delivered after this client was deactivated." };
    }
  }
  return { allowed: true, reason: "" };
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
  const headers = ["invoice_number", "invoice_date", "due_date", "participant_name", "participant_ndis_number", "recipient_name", "recipient_email", "service_date", "support_item_number", "support_item_name", "description", "quantity", "unit_type", "rate", "amount", "gst_code", "pricing_version", "evidence_status", "approval_status", "payment_status"];
  const rows = lines.map((line) => [
    invoice.invoiceNumber,
    invoice.invoiceDate,
    invoice.dueDate,
    invoice.participantName,
    invoice.participantNdisNumber || "",
    invoice.recipientName,
    invoice.recipientEmail,
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
      priceLimit: null,
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

function normaliseRatePeriod(unitType: string): "hour" | "week" | "month" {
  const unit = unitType.toLowerCase();
  if (unit.includes("week")) return "week";
  if (unit.includes("month")) return "month";
  return "hour";
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

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function createId(prefix: string) {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
