import type { PlanLimits } from "@/lib/subscriptions/catalog";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

export type OrganisationUsageSnapshot = {
  activeParticipants: number;
  users: number;
  houses: number;
  documents: number;
  documentsPerParticipant: number;
  aiAnalysedNotesPerMonth: number;
  planDocumentsProcessedPerMonth: number;
  storageBytes: number;
  invoiceLinesPerMonth: number;
  activeServiceAgreements: number;
};

export type SubscriptionUsageResponse = {
  tier: SubscriptionTier;
  tierName: string;
  status: string;
  enforcementMode: "monitor" | "enforce";
  trialEndsAt: string;
  currentPeriodEnd: string;
  usage: OrganisationUsageSnapshot;
  limits: PlanLimits;
  source: "supabase";
};

