import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

export interface PlanToProgressEntitlements {
  enabled: boolean;
  maxActiveParticipants: number | null;
  maxUsers: number | null;
  maxDocumentsPerParticipant: number | null;
  maxAiAnalysedNotesPerMonth: number | null;
  maxStorageBytes: number | null;
  maxApprovalStages: number | null;
  basicPlanParsing: boolean;
  multiDocumentParsing: boolean;
  bulkPlanProcessing: boolean;
  automatedDocumentSync: boolean;
  goalExtraction: boolean;
  riskExtraction: boolean;
  strategyExtraction: boolean;
  supportNeedExtraction: boolean;
  sourcePageTraceability: boolean;
  paragraphLevelTraceability: boolean;
  conflictDetection: boolean;
  verifiedBaseline: boolean;
  customBaselineTemplates: boolean;
  multipleBaselinesPerGoal: boolean;
  customProgressScales: boolean;
  customEvidenceRules: boolean;
  goalLinkedNotes: boolean;
  evidenceStrengthScoring: boolean;
  contradictionDetection: boolean;
  evidenceGapAlerts: boolean;
  longitudinalAnalysis: boolean;
  cohortAnalytics: boolean;
  organisationWideAnalytics: boolean;
  basicCharts: boolean;
  advancedCharts: boolean;
  configurableDashboards: boolean;
  executiveDashboards: boolean;
  basicProgressReport: boolean;
  brandedReports: boolean;
  customReportBuilder: boolean;
  scheduledReports: boolean;
  boardReports: boolean;
  teamsIntegration: boolean;
  sharePointIntegration: boolean;
  outlookIntegration: boolean;
  googleDriveIntegration: boolean;
  apiAccess: boolean;
  dataWarehouseExport: boolean;
  selfVerification: boolean;
  managerVerification: boolean;
  multiStageApproval: boolean;
  customRoles: boolean;
  delegatedAdministration: boolean;
  customAiRules: boolean;
  organisationPolicyIntelligence: boolean;
  customDocumentTypes: boolean;
  whiteLabel: boolean;
}

const solo: PlanToProgressEntitlements = {
  enabled: true, maxActiveParticipants: 10, maxUsers: 1, maxDocumentsPerParticipant: 2, maxAiAnalysedNotesPerMonth: 100, maxStorageBytes: 500 * 1024 * 1024, maxApprovalStages: 1,
  basicPlanParsing: true, multiDocumentParsing: false, bulkPlanProcessing: false, automatedDocumentSync: false,
  goalExtraction: true, riskExtraction: false, strategyExtraction: true, supportNeedExtraction: true, sourcePageTraceability: true, paragraphLevelTraceability: false, conflictDetection: false,
  verifiedBaseline: true, customBaselineTemplates: false, multipleBaselinesPerGoal: false, customProgressScales: false, customEvidenceRules: false,
  goalLinkedNotes: true, evidenceStrengthScoring: false, contradictionDetection: false, evidenceGapAlerts: false, longitudinalAnalysis: false, cohortAnalytics: false, organisationWideAnalytics: false,
  basicCharts: true, advancedCharts: false, configurableDashboards: false, executiveDashboards: false,
  basicProgressReport: true, brandedReports: false, customReportBuilder: false, scheduledReports: false, boardReports: false,
  teamsIntegration: false, sharePointIntegration: false, outlookIntegration: false, googleDriveIntegration: false, apiAccess: false, dataWarehouseExport: false,
  selfVerification: true, managerVerification: false, multiStageApproval: false, customRoles: false, delegatedAdministration: false,
  customAiRules: false, organisationPolicyIntelligence: false, customDocumentTypes: false, whiteLabel: false
};

const team: PlanToProgressEntitlements = {
  ...solo, maxActiveParticipants: 50, maxUsers: 10, maxDocumentsPerParticipant: 5, maxAiAnalysedNotesPerMonth: 1000, maxStorageBytes: 10 * 1024 * 1024 * 1024, maxApprovalStages: 2,
  riskExtraction: true, evidenceStrengthScoring: true, contradictionDetection: true, evidenceGapAlerts: true, longitudinalAnalysis: true, advancedCharts: true, brandedReports: true, managerVerification: true
};

const growth: PlanToProgressEntitlements = {
  ...team, maxActiveParticipants: 250, maxUsers: 50, maxDocumentsPerParticipant: null, maxAiAnalysedNotesPerMonth: 10000, maxStorageBytes: 100 * 1024 * 1024 * 1024, maxApprovalStages: 4,
  multiDocumentParsing: true, automatedDocumentSync: true, paragraphLevelTraceability: true, conflictDetection: true, customBaselineTemplates: true, customProgressScales: true, customEvidenceRules: true,
  cohortAnalytics: true, configurableDashboards: true, customReportBuilder: true, scheduledReports: true, sharePointIntegration: true, outlookIntegration: true, googleDriveIntegration: true,
  multiStageApproval: true, customAiRules: true, organisationPolicyIntelligence: true, customDocumentTypes: true
};

const enterprise: PlanToProgressEntitlements = {
  ...growth, maxActiveParticipants: null, maxUsers: null, maxAiAnalysedNotesPerMonth: null, maxStorageBytes: null, maxApprovalStages: null,
  bulkPlanProcessing: true, multipleBaselinesPerGoal: true, organisationWideAnalytics: true, executiveDashboards: true, boardReports: true,
  teamsIntegration: true, apiAccess: true, dataWarehouseExport: true, customRoles: true, delegatedAdministration: true, whiteLabel: true
};

export const planToProgressEntitlements: Record<SubscriptionTier, PlanToProgressEntitlements> = {
  solo,
  team,
  growth,
  enterprise
};

export type PlanToProgressEntitlementKey = keyof PlanToProgressEntitlements;

export function getPlanToProgressEntitlements(tier: SubscriptionTier) {
  return planToProgressEntitlements[tier];
}
