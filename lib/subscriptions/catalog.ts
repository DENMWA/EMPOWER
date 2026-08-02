import { getBillingEntitlements } from "@/lib/subscriptions/billing-entitlements";
import { getPlanToProgressEntitlements } from "@/lib/subscriptions/entitlements";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

export type OperationalEntitlements = {
  coreDocumentation: boolean;
  incidentReporting: boolean;
  documentVault: boolean;
  historicalExports: boolean;
  teamManagement: boolean;
  managerReview: boolean;
  auditPacks: boolean;
  brandedReports: boolean;
  comparativeAnalytics: boolean;
  multiLocation: boolean;
  customTemplates: boolean;
  scheduledReports: boolean;
  advancedAnalytics: boolean;
  customRoles: boolean;
  delegatedAdministration: boolean;
  executiveDashboards: boolean;
  apiAccess: boolean;
  dataWarehouseExport: boolean;
  whiteLabel: boolean;
};

export type PlanLimits = {
  activeParticipants: number | null;
  users: number | null;
  houses: number | null;
  documentsPerParticipant: number | null;
  aiAnalysedNotesPerMonth: number | null;
  storageBytes: number | null;
  approvalStages: number | null;
  invoiceLinesPerMonth: number | null;
  activeServiceAgreements: number | null;
};

export type PlanCatalogueEntry = {
  tier: SubscriptionTier;
  limits: PlanLimits;
  operations: OperationalEntitlements;
  intelligence: ReturnType<typeof getPlanToProgressEntitlements>;
  billing: ReturnType<typeof getBillingEntitlements>;
};

const operationalEntitlements: Record<SubscriptionTier, OperationalEntitlements> = {
  solo: {
    coreDocumentation: true,
    incidentReporting: true,
    documentVault: true,
    historicalExports: true,
    teamManagement: false,
    managerReview: false,
    auditPacks: false,
    brandedReports: false,
    comparativeAnalytics: false,
    multiLocation: false,
    customTemplates: false,
    scheduledReports: false,
    advancedAnalytics: false,
    customRoles: false,
    delegatedAdministration: false,
    executiveDashboards: false,
    apiAccess: false,
    dataWarehouseExport: false,
    whiteLabel: false
  },
  practice: {
    coreDocumentation: true,
    incidentReporting: true,
    documentVault: true,
    historicalExports: true,
    teamManagement: true,
    managerReview: true,
    auditPacks: true,
    brandedReports: true,
    comparativeAnalytics: true,
    multiLocation: false,
    customTemplates: false,
    scheduledReports: false,
    advancedAnalytics: false,
    customRoles: false,
    delegatedAdministration: false,
    executiveDashboards: false,
    apiAccess: false,
    dataWarehouseExport: false,
    whiteLabel: false
  },
  provider: {
    coreDocumentation: true,
    incidentReporting: true,
    documentVault: true,
    historicalExports: true,
    teamManagement: true,
    managerReview: true,
    auditPacks: true,
    brandedReports: true,
    comparativeAnalytics: true,
    multiLocation: true,
    customTemplates: true,
    scheduledReports: true,
    advancedAnalytics: true,
    customRoles: false,
    delegatedAdministration: false,
    executiveDashboards: false,
    apiAccess: false,
    dataWarehouseExport: false,
    whiteLabel: false
  },
  enterprise: {
    coreDocumentation: true,
    incidentReporting: true,
    documentVault: true,
    historicalExports: true,
    teamManagement: true,
    managerReview: true,
    auditPacks: true,
    brandedReports: true,
    comparativeAnalytics: true,
    multiLocation: true,
    customTemplates: true,
    scheduledReports: true,
    advancedAnalytics: true,
    customRoles: false,
    delegatedAdministration: false,
    executiveDashboards: true,
    apiAccess: false,
    dataWarehouseExport: false,
    whiteLabel: true
  }
};

const houseLimits: Record<SubscriptionTier, number | null> = {
  solo: 1,
  practice: 5,
  provider: 25,
  enterprise: null
};

export function getPlanCatalogueEntry(tier: SubscriptionTier): PlanCatalogueEntry {
  const intelligence = getPlanToProgressEntitlements(tier);
  const billing = getBillingEntitlements(tier);

  return {
    tier,
    intelligence,
    billing,
    operations: operationalEntitlements[tier],
    limits: {
      activeParticipants: intelligence.maxActiveParticipants,
      users: intelligence.maxUsers,
      houses: houseLimits[tier],
      documentsPerParticipant: intelligence.maxDocumentsPerParticipant,
      aiAnalysedNotesPerMonth: intelligence.maxAiAnalysedNotesPerMonth,
      storageBytes: intelligence.maxStorageBytes,
      approvalStages: intelligence.maxApprovalStages,
      invoiceLinesPerMonth: billing.maxInvoiceLinesPerMonth,
      activeServiceAgreements: billing.maxActiveServiceAgreements
    }
  };
}

export const planCatalogue: Record<SubscriptionTier, PlanCatalogueEntry> = {
  solo: getPlanCatalogueEntry("solo"),
  practice: getPlanCatalogueEntry("practice"),
  provider: getPlanCatalogueEntry("provider"),
  enterprise: getPlanCatalogueEntry("enterprise")
};
