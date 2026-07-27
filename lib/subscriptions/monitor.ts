import { getPlanCatalogueEntry, type PlanLimits } from "@/lib/subscriptions/catalog";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

export type PlanUsageSnapshot = {
  activeParticipants: number;
  users: number;
  houses: number;
  documentsPerParticipant: number;
  aiAnalysedNotesPerMonth: number;
  storageBytes: number;
  approvalStages: number;
  invoiceLinesPerMonth: number;
  activeServiceAgreements: number;
};

export type PlanLimitObservation = {
  resource: keyof PlanLimits;
  used: number;
  limit: number | null;
  percentage: number | null;
  wouldBlock: boolean;
};

export function evaluatePlanUsage(tier: SubscriptionTier, usage: PlanUsageSnapshot): PlanLimitObservation[] {
  const limits = getPlanCatalogueEntry(tier).limits;

  return (Object.keys(limits) as Array<keyof PlanLimits>).map((resource) => {
    const limit = limits[resource];
    const used = usage[resource];

    return {
      resource,
      used,
      limit,
      percentage: limit === null || limit === 0 ? null : Math.round((used / limit) * 100),
      wouldBlock: limit !== null && used >= limit
    };
  });
}

