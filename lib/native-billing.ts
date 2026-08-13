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
export type InvoiceRateSource = "ndis_catalogue" | "service_agreement" | "manual";

export type InvoiceServiceSelection = {
  shiftId: string;
  rateSource: InvoiceRateSource;
  approved: boolean;
  agreementItemId?: string;
  supportItemId?: string;
  manualRate?: number;
  manualUnitType?: string;
  includeTravel?: boolean;
};

export type SupportShift = {
  id: string;
  participantId: string;
  participantName: string;
  staffId: string;
  staffName: string;
  assignedStaffCount: number;
  staffingRatio?: string;
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
  timeBand?: string;
  stateOrRegion?: string;
  remoteType?: string;
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
    assignedStaffCount: input.staff ? 1 : 0,
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
  agreement?: ServiceAgreement;
  noteRecordId?: string;
}) {
  const records = getNativeBillingRecords();
  const existing = records.shifts.find((shift) => shift.id === input.rosterShift.id || shift.rosterShiftId === input.rosterShift.id);
  if (existing && (!input.agreement || existing.serviceAgreementId === input.agreement.id)) return { shift: existing, error: "" };

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
    assignedStaffCount: assignedStaff.filter((worker) => worker.id).length,
    staffingRatio: input.rosterShift.staffingRatio,
    serviceAgreementId: input.agreement?.id || "",
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

export function reconcileCompletedRosterServices(inputs: Array<{ rosterShift: RosterShift; agreement?: ServiceAgreement; noteRecordId?: string }>) {
  if (!inputs.length) return { linked: 0, records: getNativeBillingRecords() };
  const original = getNativeBillingRecords();
  let linked = 0;
  const shifts = [...original.shifts];
  inputs.forEach(({ rosterShift, agreement, noteRecordId }) => {
    const index = shifts.findIndex((shift) => shift.id === rosterShift.id || shift.rosterShiftId === rosterShift.id);
    if (index >= 0) return;
    const assignedStaff = rosterShift.assignedWorkers?.length ? rosterShift.assignedWorkers : [{ id: rosterShift.workerId, name: rosterShift.workerName }];
    shifts.unshift({ id: rosterShift.id, rosterShiftId: rosterShift.id, participantId: rosterShift.participantId, participantName: rosterShift.participantName, staffId: assignedStaff[0]?.id || "", staffName: assignedStaff.map((worker) => worker.name).join(", "), assignedStaffCount: assignedStaff.filter((worker) => worker.id).length, staffingRatio: rosterShift.staffingRatio, serviceAgreementId: agreement?.id || "", title: rosterShift.supportType, supportType: rosterShift.supportType, location: rosterShift.location, startTime: `${rosterShift.shiftDate}T${rosterShift.startTime}:00`, endTime: `${rosterShift.shiftDate}T${rosterShift.endTime}:00`, status: "completed", recurrenceRule: "", noteRecordId, createdAt: new Date().toISOString() });
    linked += 1;
  });
  if (!linked) return { linked, records: original };
  const records = { ...original, shifts };
  saveNativeBillingRecords(records);
  return { linked, records };
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
  return createInvoiceFromServices([{ shiftId, rateSource: "service_agreement", agreementItemId: agreementItem.id, supportItemId: agreementItem.supportItemId, approved: true }], notes, client);
}

export function createInvoiceFromServices(
  selections: InvoiceServiceSelection[],
  notes: RetainedRecord[],
  client?: ClientRecord
) {
  const records = getNativeBillingRecords();
  if (!selections.length) return { invoice: null, lines: [], error: "Select at least one completed service." };

  if (selections.some((selection) => !selection.approved)) return { invoice: null, lines: [], error: "Approve the rate and support code for every selected service." };

  const selected = selections.map((selection) => ({
    selection,
    includeTravel: Boolean(selection.includeTravel),
    shift: records.shifts.find((item) => item.id === selection.shiftId),
    agreementItem: selection.rateSource === "service_agreement"
      ? records.agreementItems.find((item) => item.id === selection.agreementItemId && item.status === "active")
      : undefined,
    supportItem: records.supportItems.find((item) => item.id === selection.supportItemId)
  }));
  if (selected.some(({ shift }) => !shift)) return { invoice: null, lines: [], error: "One or more completed services could not be found." };
  if (selected.some(({ selection, agreementItem }) => selection.rateSource === "service_agreement" && !agreementItem)) return { invoice: null, lines: [], error: "Choose an active service agreement rate for every agreement-priced service." };
  if (selected.some(({ supportItem }) => !supportItem)) return { invoice: null, lines: [], error: "Confirm the applicable NDIS support item code for every service." };
  if (selected.some(({ selection, supportItem }) => selection.rateSource === "ndis_catalogue" && supportItem?.priceLimit === null)) return { invoice: null, lines: [], error: "The selected NDIS support item does not have an active price limit." };
  if (selected.some(({ selection }) => selection.rateSource === "manual" && (!selection.manualRate || selection.manualRate <= 0))) return { invoice: null, lines: [], error: "Enter a valid manual rate for every manually priced service." };

  const shifts = selected.map(({ shift }) => shift as SupportShift);
  const participantId = shifts[0].participantId;
  if (shifts.some((shift) => shift.participantId !== participantId)) return { invoice: null, lines: [], error: "An invoice can only contain services for one participant." };
  const agreement = records.agreements.find((item) => item.id === shifts[0].serviceAgreementId);
  if (!agreement || shifts.some((shift) => shift.serviceAgreementId !== agreement.id)) return { invoice: null, lines: [], error: "Selected services must use the same active service agreement." };
  for (const shift of shifts) {
    const expectedStaff = getExpectedStaffCount(shift.staffingRatio);
    const assignedStaff = Math.max(1, shift.assignedStaffCount || 1);
    if (expectedStaff && expectedStaff !== assignedStaff) {
      return { invoice: null, lines: [], error: `${shift.participantName}'s ${shift.staffingRatio} roster ratio does not match the ${assignedStaff} assigned staff. Correct the roster before invoicing.` };
    }
  }

  for (const { shift: possibleShift, agreementItem: possibleItem, includeTravel, selection } of selected) {
    if (!includeTravel) continue;
    const shift = possibleShift as SupportShift;
    const agreementItem = possibleItem as ServiceAgreementItem | undefined;
    if (selection.rateSource !== "service_agreement" || !agreementItem?.allowTravel || !agreementItem.allowKilometres) {
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
  const lines = selected.map(({ shift: possibleShift, agreementItem, supportItem, selection }) => {
    const shift = possibleShift as SupportShift;
    const serviceDate = formatDateOnly(new Date(shift.startTime));
    const supportItemNumber = supportItem!.supportItemNumber;
    const supportItemName = supportItem!.supportItemName;
    const unitType = selection.rateSource === "service_agreement" ? agreementItem!.unitType : selection.rateSource === "manual" ? selection.manualUnitType || supportItem!.unitType : supportItem!.unitType;
    const rate = selection.rateSource === "ndis_catalogue" ? supportItem!.priceLimit! : selection.rateSource === "service_agreement" ? agreementItem!.agreedRate : selection.manualRate!;
    const pricingVersionId = supportItem!.pricingVersionId;
    const priceLimit = supportItem!.priceLimit;
    const pricingVersion = records.pricingVersions.find((item) => item.id === pricingVersionId);
    const quantity = getBillableQuantity(shift, unitType);
    const evidenceStatus = getEvidenceStatus(shift, notes);
    const priceCheckStatus = selection.rateSource === "manual" ? "manual_review_required" : getPriceCheckStatus(rate, priceLimit);
    const duplicate = records.invoiceLines.some((line) => line.shiftId === shift.id && line.approvalStatus !== "needs_correction");
    const missingNdisCode = !supportItemNumber || supportItemNumber === "AGREED-SUPPORT";
    const exceptionReason = [
      duplicate && "Possible duplicate billing detected",
      evidenceStatus === "missing_note" && "Completed shift has no linked support note",
      missingNdisCode && "NDIS support item number requires confirmation",
      priceCheckStatus === "over_limit" && "Agreed rate is above selected NDIS price limit",
      priceCheckStatus === "manual_review_required" && "Pricing version or price limit requires review"
    ].filter(Boolean).join("; ");
    const amount = roundCurrency(quantity * rate);

    return {
      id: createId("invoice-line"),
      invoiceId,
      shiftId: shift.id,
      serviceAgreementId: agreement.id,
      serviceAgreementItemId: agreementItem?.id || "",
      participantId: shift.participantId,
      serviceDate,
      supportItemNumber,
      supportItemName,
      description: supportItemNumber,
      quantity,
      unitType,
      rate,
      amount,
      gstCode: "GST-free",
      pricingVersionId,
      pricingVersionName: pricingVersion?.versionName || "NDIS catalogue",
      ndisPriceLimitUsed: priceLimit,
      agreedRateUsed: rate,
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
  const headers = ["invoice_number", "invoice_date", "due_date", "participant_name", "participant_ndis_number", "recipient_name", "recipient_email", "service_date", "support_item_number", "quantity", "unit_type", "rate", "amount", "gst_code", "payment_status"];
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
    String(line.quantity),
    line.unitType,
    String(line.rate),
    String(line.amount),
    line.gstCode,
    invoice.paymentStatus
  ]);
  return [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, "\"\"")}"`).join(",")).join("\n");
}

export function matchNdisSupportItems(shift: Pick<SupportShift, "supportType" | "title" | "startTime">, items: NdisSupportItem[], versions: NdisPricingVersion[]) {
  const serviceDate = shift.startTime.slice(0, 10);
  const activeVersionIds = new Set(versions.filter((version) => version.status === "active" && (!version.effectiveFrom || version.effectiveFrom <= serviceDate) && (!version.effectiveTo || version.effectiveTo >= serviceDate)).map((version) => version.id));
  const serviceTokens = tokenise(`${shift.supportType} ${shift.title}`);
  return items
    .filter((item) => activeVersionIds.has(item.pricingVersionId) && item.priceLimit !== null && (!item.effectiveFrom || item.effectiveFrom <= serviceDate) && (!item.effectiveTo || item.effectiveTo >= serviceDate))
    .map((item) => {
      const itemTokens = tokenise(`${item.supportItemName} ${item.supportCategory} ${item.registrationGroup} ${item.timeBand || ""} ${item.claimType}`);
      const overlap = serviceTokens.filter((token) => itemTokens.includes(token)).length;
      const score = serviceTokens.length ? overlap / serviceTokens.length : 0;
      return { item, confidence: Math.round(Math.min(0.99, 0.35 + score * 0.6) * 100) };
    })
    .sort((a, b) => b.confidence - a.confidence || a.item.supportItemNumber.localeCompare(b.item.supportItemNumber))
    .slice(0, 5);
}

export function getBillableQuantity(shift: Pick<SupportShift, "startTime" | "endTime" | "assignedStaffCount">, unitType: string) {
  if (!unitType.toLowerCase().includes("hour")) return 1;
  const duration = Math.max(0.25, getHoursBetween(shift.startTime, shift.endTime));
  return Math.round(duration * Math.max(1, shift.assignedStaffCount || 1) * 100) / 100;
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

function tokenise(value: string) {
  const ignored = new Set(["and", "the", "support", "service", "shift", "with", "for", "client"]);
  return Array.from(new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((token) => token.length > 2 && !ignored.has(token))));
}

function getExpectedStaffCount(ratio?: string) {
  const match = ratio?.trim().match(/^(\d+)\s*:\s*1$/);
  return match ? Number(match[1]) : 0;
}

function createId(prefix: string) {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
