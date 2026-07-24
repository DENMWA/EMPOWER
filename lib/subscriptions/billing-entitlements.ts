import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

export interface BillingEntitlements {
  schedulingEnabled: boolean;
  nativeInvoicingEnabled: boolean;
  maxInvoiceLinesPerMonth: number | null;
  maxActiveServiceAgreements: number | null;
  recurringShifts: boolean;
  teamScheduling: boolean;
  invoiceApprovals: boolean;
  bulkInvoiceGeneration: boolean;
  travelAndKilometres: boolean;
  nonFaceToFaceBilling: boolean;
  cancellationBilling: boolean;
  budgetTracking: boolean;
  advancedBudgetForecasting: boolean;
  invoiceBatching: boolean;
  scheduledInvoiceGeneration: boolean;
  customInvoiceTemplates: boolean;
  manualPricingImport: boolean;
  automaticNdiaPricingImport: boolean;
  pricingVersionDiff: boolean;
  pricingActivationWorkflow: boolean;
  accountingExportHooks: boolean;
  xeroIntegration: boolean;
  myobIntegration: boolean;
  quickbooksIntegration: boolean;
  apiBillingAccess: boolean;
}

const solo: BillingEntitlements = {
  schedulingEnabled: true,
  nativeInvoicingEnabled: true,
  maxInvoiceLinesPerMonth: 100,
  maxActiveServiceAgreements: 10,
  recurringShifts: true,
  teamScheduling: false,
  invoiceApprovals: false,
  bulkInvoiceGeneration: false,
  travelAndKilometres: false,
  nonFaceToFaceBilling: false,
  cancellationBilling: true,
  budgetTracking: true,
  advancedBudgetForecasting: false,
  invoiceBatching: false,
  scheduledInvoiceGeneration: false,
  customInvoiceTemplates: false,
  manualPricingImport: true,
  automaticNdiaPricingImport: false,
  pricingVersionDiff: false,
  pricingActivationWorkflow: true,
  accountingExportHooks: false,
  xeroIntegration: false,
  myobIntegration: false,
  quickbooksIntegration: false,
  apiBillingAccess: false
};

const practice: BillingEntitlements = {
  ...solo,
  maxInvoiceLinesPerMonth: 2000,
  maxActiveServiceAgreements: 50,
  teamScheduling: true,
  invoiceApprovals: true,
  bulkInvoiceGeneration: true,
  travelAndKilometres: true,
  nonFaceToFaceBilling: true,
  invoiceBatching: true,
  pricingVersionDiff: true
};

const provider: BillingEntitlements = {
  ...practice,
  maxInvoiceLinesPerMonth: 20000,
  maxActiveServiceAgreements: 300,
  advancedBudgetForecasting: true,
  scheduledInvoiceGeneration: true,
  customInvoiceTemplates: true,
  automaticNdiaPricingImport: true,
  accountingExportHooks: true
};

const enterprise: BillingEntitlements = {
  ...provider,
  maxInvoiceLinesPerMonth: null,
  maxActiveServiceAgreements: null,
  xeroIntegration: true,
  myobIntegration: true,
  quickbooksIntegration: true,
  apiBillingAccess: true
};

export const billingEntitlements: Record<SubscriptionTier, BillingEntitlements> = {
  solo,
  practice,
  provider,
  enterprise
};

export function getBillingEntitlements(tier: SubscriptionTier) {
  return billingEntitlements[tier];
}
