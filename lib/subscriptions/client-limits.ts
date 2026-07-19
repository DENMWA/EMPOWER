import { getPlanToProgressEntitlements } from "@/lib/subscriptions/entitlements";
import { getCurrentSubscriptionTier } from "@/lib/subscriptions/browser-tier";
import { subscriptionTiers } from "@/lib/subscriptions/tiers";

export type LimitCheckResult = {
  allowed: boolean;
  message: string;
};

function limitMessage(resource: string, used: number, limit: number, tierName: string) {
  return `${tierName} allows ${limit.toLocaleString()} ${resource}. You currently have ${used.toLocaleString()}. Upgrade or archive records before adding more.`;
}

export function checkActiveParticipantLimit(currentCount: number): LimitCheckResult {
  const tier = getCurrentSubscriptionTier();
  const entitlements = getPlanToProgressEntitlements(tier);
  const limit = entitlements.maxActiveParticipants;
  if (limit === null || currentCount < limit) return { allowed: true, message: "" };

  return {
    allowed: false,
    message: limitMessage("active participants/clients", currentCount, limit, subscriptionTiers[tier].shortName)
  };
}

export function checkUserLimit(currentCount: number): LimitCheckResult {
  const tier = getCurrentSubscriptionTier();
  const entitlements = getPlanToProgressEntitlements(tier);
  const limit = entitlements.maxUsers;
  if (limit === null || currentCount < limit) return { allowed: true, message: "" };

  return {
    allowed: false,
    message: limitMessage("users", currentCount, limit, subscriptionTiers[tier].shortName)
  };
}

export function checkDocumentsPerParticipantLimit(currentCount: number, clientName: string): LimitCheckResult {
  const tier = getCurrentSubscriptionTier();
  const entitlements = getPlanToProgressEntitlements(tier);
  const limit = entitlements.maxDocumentsPerParticipant;
  if (limit === null || currentCount < limit) return { allowed: true, message: "" };

  return {
    allowed: false,
    message: `${subscriptionTiers[tier].shortName} allows ${limit.toLocaleString()} documents per participant. ${clientName} already has ${currentCount.toLocaleString()}. Upgrade or archive older documents before uploading more.`
  };
}
