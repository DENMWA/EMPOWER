import type { ClientRecord } from "@/lib/client-records";
import type {
  NativeBillingRecords,
  NativeInvoice,
  NativeInvoiceLine,
  NdisPricingVersion,
  NdisSupportItem,
  ServiceAgreement,
  ServiceAgreementItem,
  SupportShift
} from "@/lib/native-billing";
import { getNativeBillingRecords } from "@/lib/native-billing";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { getCurrentOrganisationId, getCurrentUserId, supabaseRequest, supabaseRpc } from "@/lib/supabase-rest";
import type { StaffRecord } from "@/lib/staff-records";
import { tenantStorageKey } from "@/lib/tenant-storage";

type CloudRow = Record<string, unknown>;
let syncQueue = Promise.resolve();

export function queueNativeBillingCloudSync(records: NativeBillingRecords, previousRecords: NativeBillingRecords) {
  if (typeof window === "undefined" || isPresentationModeEnabled()) return Promise.resolve();
  const operation = syncQueue
    .then(() => syncNativeBillingRecordsToCloud(records))
    .then(() => undefined)
    .catch((error) => {
      console.error("Native billing cloud sync failed", error);
      window.sessionStorage.setItem(tenantStorageKey("empowernotes:native-billing-records"), JSON.stringify(previousRecords));
      window.dispatchEvent(new Event("empowernotes:native-billing-updated"));
      window.dispatchEvent(new CustomEvent("empowernotes:native-billing-cloud-status", {
        detail: { ok: false, message: "Billing changes could not be saved and were rolled back. Review the error and try again." }
      }));
      throw error;
    });
  syncQueue = operation.catch(() => undefined);
  return operation;
}

export function waitForNativeBillingCloudSync() {
  return syncQueue;
}

export async function loadTenantNativeBillingRecords(clients: ClientRecord[], staff: StaffRecord[]) {
  if (typeof window === "undefined" || isPresentationModeEnabled()) return getNativeBillingRecords();
  const organisationId = await getCurrentOrganisationId();
  if (!organisationId) return getEmptyTenantBillingRecords();

  const results = await Promise.all([
    supabaseRequest<CloudRow[]>("support_shifts", { query: "select=*&order=start_time.desc" }),
    supabaseRequest<CloudRow[]>("shift_staff", { query: "select=*" }),
    supabaseRequest<CloudRow[]>("shift_notes", { query: "select=*" }),
    supabaseRequest<CloudRow[]>("ndis_pricing_versions", { query: "select=*&order=effective_from.desc" }),
    supabaseRequest<CloudRow[]>("ndis_support_items", { query: "select=*&order=support_item_number.asc" }),
    supabaseRequest<CloudRow[]>("service_agreements", { query: "select=*&order=created_at.desc" }),
    supabaseRequest<CloudRow[]>("service_agreement_items", { query: "select=*&order=created_at.desc" }),
    supabaseRequest<CloudRow[]>("native_invoices", { query: "select=*&order=created_at.desc" }),
    supabaseRequest<CloudRow[]>("native_invoice_lines", { query: "select=*&order=created_at.desc" })
  ]);

  if (results.some((result) => result.error)) return getEmptyTenantBillingRecords();

  const [shiftRows, staffRows, noteRows, pricingRows, supportItemRows, agreementRows, agreementItemRows, invoiceRows, invoiceLineRows] = results.map((result) => result.data || []);
  const clientNames = new Map(clients.map((client) => [client.id, client.name]));
  const staffNames = new Map(staff.map((worker) => [worker.id, worker.name]));
  const shiftStaff = new Map<string, string[]>();
  staffRows.forEach((row) => {
    const shiftId = asString(row.shift_id);
    const staffId = asString(row.staff_invite_id) || asString(row.staff_user_id);
    if (!shiftId || !staffId) return;
    shiftStaff.set(shiftId, [...(shiftStaff.get(shiftId) || []), staffId]);
  });
  const shiftNotes = new Map(noteRows.map((row) => [asString(row.shift_id), asString(row.note_id)]));

  const records: NativeBillingRecords = {
    shifts: shiftRows.map((row) => toShift(row, clientNames, staffNames, shiftStaff, shiftNotes)),
    pricingVersions: pricingRows.map((row) => toPricingVersion(row)),
    supportItems: supportItemRows.map(toSupportItem),
    agreements: agreementRows.map((row) => toAgreement(row, clientNames)),
    agreementItems: agreementItemRows.map(toAgreementItem),
    invoices: invoiceRows.map((row) => toInvoice(row, clientNames)),
    invoiceLines: invoiceLineRows.map(toInvoiceLine)
  };

  window.sessionStorage.setItem(tenantStorageKey("empowernotes:native-billing-records"), JSON.stringify(records));
  return records;
}

function getEmptyTenantBillingRecords(): NativeBillingRecords {
  return { shifts: [], pricingVersions: [], supportItems: [], agreements: [], agreementItems: [], invoices: [], invoiceLines: [] };
}

async function syncNativeBillingRecordsToCloud(records: NativeBillingRecords) {
  const organisationId = await getCurrentOrganisationId();
  const userId = getCurrentUserId();
  if (!organisationId || !userId) return;

  const organisationPricing = records.pricingVersions.filter((version) => version.scope !== "platform");
  const organisationPricingIds = new Set(organisationPricing.map((version) => version.id));
  const operations: Array<Promise<{ data: unknown; error: string }>> = [];

  pushUpsert(operations, "ndis_pricing_versions", organisationPricing.map((version) => ({
    id: version.id,
    organisation_id: organisationId,
    version_name: version.versionName,
    effective_from: version.effectiveFrom,
    effective_to: version.effectiveTo || null,
    source_name: version.sourceName,
    source_url: version.sourceUrl || null,
    source_filename: version.sourceFilename || null,
    import_method: version.importMethod,
    imported_by: userId,
    imported_at: version.importedAt,
    reviewed_by: version.reviewedAt ? userId : null,
    reviewed_at: version.reviewedAt || null,
    activated_by: version.activatedAt ? userId : null,
    activated_at: version.activatedAt || null,
    status: version.status,
    validation_warnings: version.validationWarnings
  })));
  await flushOperations(operations);

  pushUpsert(operations, "ndis_support_items", records.supportItems.filter((item) => organisationPricingIds.has(item.pricingVersionId)).map((item) => ({
    id: item.id,
    pricing_version_id: item.pricingVersionId,
    support_item_number: item.supportItemNumber,
    support_item_name: item.supportItemName,
    registration_group: item.registrationGroup || null,
    support_category: item.supportCategory || null,
    unit_type: item.unitType,
    claim_type: item.claimType || null,
    price_limit: item.priceLimit,
    gst_code: item.gstCode || null,
    effective_from: item.effectiveFrom,
    effective_to: item.effectiveTo || null
  })));

  const agreementRows = records.agreements.map((agreement) => ({
    id: agreement.id,
    organisation_id: organisationId,
    participant_id: agreement.participantId,
    agreement_name: agreement.agreementName,
    start_date: agreement.startDate,
    end_date: agreement.endDate || null,
    billing_frequency: agreement.billingFrequency,
    invoice_recipient_type: agreement.invoiceRecipientType,
    invoice_recipient_name: agreement.invoiceRecipientName,
    invoice_recipient_email: agreement.invoiceRecipientEmail || null,
    plan_manager_name: agreement.planManagerName || null,
    plan_manager_email: agreement.planManagerEmail || null,
    status: agreement.status,
    created_by: userId,
    created_at: agreement.createdAt
  }));

  const agreementItemRows = records.agreementItems.map((item) => ({
    id: item.id,
    organisation_id: organisationId,
    service_agreement_id: item.serviceAgreementId,
    participant_id: item.participantId,
    ndis_support_item_id: item.supportItemId || null,
    pricing_version_id: item.pricingVersionId || null,
    support_item_number: item.supportItemNumber,
    support_item_name: item.supportItemName,
    agreed_rate: item.agreedRate,
    ndis_price_limit: item.ndisPriceLimit,
    unit_type: item.unitType,
    budget_category: item.budgetCategory || null,
    budget_allocated: item.budgetAllocated,
    allow_travel: item.allowTravel,
    allow_kilometres: item.allowKilometres,
    allow_non_face_to_face: item.allowNonFaceToFace,
    allow_cancellations: item.allowCancellations,
    status: item.status
  }));
  if (agreementRows.length || agreementItemRows.length) {
    operations.push(supabaseRpc("sync_service_agreement_bundle", {
      agreement_rows: agreementRows,
      agreement_item_rows: agreementItemRows
    }));
    await flushOperations(operations);
  }

  pushUpsert(operations, "support_shifts", records.shifts.map((shift) => ({
    id: shift.id,
    organisation_id: organisationId,
    participant_id: shift.participantId,
    source_roster_shift_id: shift.rosterShiftId || null,
    service_agreement_id: shift.serviceAgreementId || null,
    title: shift.title,
    support_type: shift.supportType,
    location: shift.location || null,
    start_time: shift.startTime,
    end_time: shift.endTime,
    timezone: "Australia/Sydney",
    status: shift.status,
    recurrence_rule: shift.recurrenceRule || null,
    staffing_ratio: shift.staffingRatio || "1:1",
    odometer_start: shift.odometerStart ?? null,
    odometer_end: shift.odometerEnd ?? null,
    travel_kilometres: shift.travelKilometres ?? null,
    travel_rate_per_kilometre: shift.travelRatePerKilometre ?? null,
    travel_support_item_number: shift.travelSupportItemNumber || null,
    travel_notes: shift.travelNotes || null,
    created_by: userId,
    updated_by: userId,
    created_at: shift.createdAt,
    updated_at: new Date().toISOString()
  })));
  await flushOperations(operations);

  pushUpsert(operations, "shift_notes", records.shifts.filter((shift) => shift.noteRecordId).map((shift) => ({
    id: shift.id,
    organisation_id: organisationId,
    shift_id: shift.id,
    note_id: shift.noteRecordId,
    participant_id: shift.participantId,
    created_by: userId
  })));

  const invoiceRows = records.invoices.map((invoice) => ({
    id: invoice.id,
    organisation_id: organisationId,
    participant_id: invoice.participantId,
    participant_ndis_number: invoice.participantNdisNumber || null,
    invoice_number: invoice.invoiceNumber,
    recipient_name: invoice.recipientName,
    recipient_email: invoice.recipientEmail || null,
    billing_period_start: invoice.billingPeriodStart,
    billing_period_end: invoice.billingPeriodEnd,
    invoice_date: invoice.invoiceDate,
    due_date: invoice.dueDate || null,
    status: invoice.status,
    payment_status: invoice.paymentStatus,
    total_amount: invoice.totalAmount,
    created_by: userId,
    created_at: invoice.createdAt
  }));

  const invoiceLineRows = records.invoiceLines.map((line) => ({
    id: line.id,
    organisation_id: organisationId,
    invoice_id: line.invoiceId,
    shift_id: line.shiftId || null,
    service_agreement_id: line.serviceAgreementId || null,
    service_agreement_item_id: line.serviceAgreementItemId || null,
    participant_id: line.participantId,
    service_date: line.serviceDate,
    support_item_number: line.supportItemNumber,
    support_item_name: line.supportItemName,
    description: line.description,
    quantity: line.quantity,
    unit_type: line.unitType,
    rate: line.rate,
    amount: line.amount,
    gst_code: line.gstCode || null,
    pricing_version_id: line.pricingVersionId || null,
    pricing_version_name: line.pricingVersionName,
    ndis_price_limit_used: line.ndisPriceLimitUsed,
    agreed_rate_used: line.agreedRateUsed,
    evidence_status: line.evidenceStatus,
    price_check_status: line.priceCheckStatus,
    approval_status: line.approvalStatus,
    exception_reason: line.exceptionReason || null,
    note_reference: line.noteReference || null
  }));
  if (invoiceRows.length || invoiceLineRows.length) {
    operations.push(supabaseRpc("sync_native_invoice_bundle", {
      invoice_rows: invoiceRows,
      invoice_line_rows: invoiceLineRows
    }));
    await flushOperations(operations);
  }

  window.dispatchEvent(new CustomEvent("empowernotes:native-billing-cloud-status", {
    detail: { ok: true, message: "Billing changes synced to the organisation workspace." }
  }));
}

function pushUpsert(operations: Array<Promise<{ data: unknown; error: string }>>, table: string, rows: CloudRow[]) {
  if (!rows.length) return;
  operations.push(supabaseRequest(table, {
    method: "POST",
    body: rows,
    prefer: "resolution=merge-duplicates,return=representation"
  }));
}

async function flushOperations(operations: Array<Promise<{ data: unknown; error: string }>>) {
  if (!operations.length) return;
  const pending = operations.splice(0, operations.length);
  const results = await Promise.all(pending);
  const failed = results.find((result) => result.error);
  if (failed) throw new Error(failed.error);
}

function toShift(row: CloudRow, clientNames: Map<string, string>, staffNames: Map<string, string>, shiftStaff: Map<string, string[]>, shiftNotes: Map<string, string>): SupportShift {
  const id = asString(row.id);
  const participantId = asString(row.participant_id);
  const staffIds = shiftStaff.get(id) || [];
  const staffId = staffIds[0] || "";
  return {
    id,
    participantId,
    participantName: clientNames.get(participantId) || "Client",
    staffId,
    staffName: staffIds.map((assignedId) => staffNames.get(assignedId) || "Assigned staff").join(", ") || "Unassigned staff",
    assignedStaffCount: staffIds.length,
    staffingRatio: asString(row.staffing_ratio) || undefined,
    serviceAgreementId: asString(row.service_agreement_id),
    title: asString(row.title),
    supportType: asString(row.support_type),
    location: asString(row.location),
    startTime: asString(row.start_time),
    endTime: asString(row.end_time),
    status: asString(row.status) as SupportShift["status"],
    recurrenceRule: asString(row.recurrence_rule),
    noteRecordId: shiftNotes.get(id) || "",
    rosterShiftId: asString(row.source_roster_shift_id) || undefined,
    odometerStart: asNullableNumber(row.odometer_start) ?? undefined,
    odometerEnd: asNullableNumber(row.odometer_end) ?? undefined,
    travelKilometres: asNullableNumber(row.travel_kilometres) ?? undefined,
    travelRatePerKilometre: asNullableNumber(row.travel_rate_per_kilometre) ?? undefined,
    travelSupportItemNumber: asString(row.travel_support_item_number) || undefined,
    travelNotes: asString(row.travel_notes) || undefined,
    createdAt: asString(row.created_at)
  };
}

function toPricingVersion(row: CloudRow): NdisPricingVersion {
  return {
    id: asString(row.id),
    versionName: asString(row.version_name),
    effectiveFrom: asString(row.effective_from),
    effectiveTo: asString(row.effective_to),
    sourceName: asString(row.source_name),
    sourceUrl: asString(row.source_url),
    sourceFilename: asString(row.source_filename),
    importMethod: asString(row.import_method) as NdisPricingVersion["importMethod"],
    status: asString(row.status) as NdisPricingVersion["status"],
    importedAt: asString(row.imported_at),
    reviewedAt: asString(row.reviewed_at) || undefined,
    activatedAt: asString(row.activated_at) || undefined,
    validationWarnings: Array.isArray(row.validation_warnings) ? row.validation_warnings.map(String) : [],
    scope: row.organisation_id ? "organisation" : "platform"
  };
}

function toSupportItem(row: CloudRow): NdisSupportItem {
  return {
    id: asString(row.id),
    pricingVersionId: asString(row.pricing_version_id),
    supportItemNumber: asString(row.support_item_number),
    supportItemName: asString(row.support_item_name),
    registrationGroup: asString(row.registration_group),
    supportCategory: asString(row.support_category),
    unitType: asString(row.unit_type),
    claimType: asString(row.claim_type),
    priceLimit: asNullableNumber(row.price_limit),
    gstCode: asString(row.gst_code),
    effectiveFrom: asString(row.effective_from),
    effectiveTo: asString(row.effective_to)
  };
}

function toAgreement(row: CloudRow, clientNames: Map<string, string>): ServiceAgreement {
  const participantId = asString(row.participant_id);
  return {
    id: asString(row.id),
    participantId,
    participantName: clientNames.get(participantId) || "Client",
    agreementName: asString(row.agreement_name),
    startDate: asString(row.start_date),
    endDate: asString(row.end_date),
    billingFrequency: asString(row.billing_frequency) as ServiceAgreement["billingFrequency"],
    invoiceRecipientType: asString(row.invoice_recipient_type) as ServiceAgreement["invoiceRecipientType"],
    invoiceRecipientName: asString(row.invoice_recipient_name),
    invoiceRecipientEmail: asString(row.invoice_recipient_email),
    planManagerName: asString(row.plan_manager_name),
    planManagerEmail: asString(row.plan_manager_email),
    status: asString(row.status) as ServiceAgreement["status"],
    createdAt: asString(row.created_at)
  };
}

function toAgreementItem(row: CloudRow): ServiceAgreementItem {
  return {
    id: asString(row.id),
    serviceAgreementId: asString(row.service_agreement_id),
    participantId: asString(row.participant_id),
    supportItemId: asString(row.ndis_support_item_id),
    pricingVersionId: asString(row.pricing_version_id),
    supportItemNumber: asString(row.support_item_number),
    supportItemName: asString(row.support_item_name),
    agreedRate: asNumber(row.agreed_rate),
    ndisPriceLimit: asNullableNumber(row.ndis_price_limit),
    unitType: asString(row.unit_type),
    budgetCategory: asString(row.budget_category),
    budgetAllocated: asNumber(row.budget_allocated),
    allowTravel: Boolean(row.allow_travel),
    allowKilometres: Boolean(row.allow_kilometres),
    allowNonFaceToFace: Boolean(row.allow_non_face_to_face),
    allowCancellations: Boolean(row.allow_cancellations),
    status: asString(row.status) as ServiceAgreementItem["status"]
  };
}

function toInvoice(row: CloudRow, clientNames: Map<string, string>): NativeInvoice {
  const participantId = asString(row.participant_id);
  return {
    id: asString(row.id),
    invoiceNumber: asString(row.invoice_number),
    participantId,
    participantName: clientNames.get(participantId) || "Client",
    participantNdisNumber: asString(row.participant_ndis_number),
    recipientName: asString(row.recipient_name),
    recipientEmail: asString(row.recipient_email),
    billingPeriodStart: asString(row.billing_period_start),
    billingPeriodEnd: asString(row.billing_period_end),
    invoiceDate: asString(row.invoice_date),
    dueDate: asString(row.due_date),
    status: asString(row.status) as NativeInvoice["status"],
    paymentStatus: asString(row.payment_status) as NativeInvoice["paymentStatus"],
    totalAmount: asNumber(row.total_amount),
    createdAt: asString(row.created_at)
  };
}

function toInvoiceLine(row: CloudRow): NativeInvoiceLine {
  return {
    id: asString(row.id),
    invoiceId: asString(row.invoice_id),
    shiftId: asString(row.shift_id),
    serviceAgreementId: asString(row.service_agreement_id),
    serviceAgreementItemId: asString(row.service_agreement_item_id),
    participantId: asString(row.participant_id),
    serviceDate: asString(row.service_date),
    supportItemNumber: asString(row.support_item_number),
    supportItemName: asString(row.support_item_name),
    description: asString(row.description),
    quantity: asNumber(row.quantity),
    unitType: asString(row.unit_type),
    rate: asNumber(row.rate),
    amount: asNumber(row.amount),
    gstCode: asString(row.gst_code),
    pricingVersionId: asString(row.pricing_version_id),
    pricingVersionName: asString(row.pricing_version_name),
    ndisPriceLimitUsed: asNullableNumber(row.ndis_price_limit_used),
    agreedRateUsed: asNumber(row.agreed_rate_used),
    evidenceStatus: asString(row.evidence_status) as NativeInvoiceLine["evidenceStatus"],
    priceCheckStatus: asString(row.price_check_status) as NativeInvoiceLine["priceCheckStatus"],
    approvalStatus: asString(row.approval_status) as NativeInvoiceLine["approvalStatus"],
    exceptionReason: asString(row.exception_reason),
    noteReference: asString(row.note_reference)
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function asNullableNumber(value: unknown) {
  return value == null || value === "" ? null : asNumber(value);
}
