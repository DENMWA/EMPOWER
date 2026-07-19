import { getPlanToProgressEntitlements, type PlanToProgressEntitlementKey } from "@/lib/subscriptions/entitlements";
import { defaultSubscriptionTier, subscriptionTiers, type SubscriptionTier } from "@/lib/subscriptions/tiers";

const subscriptionTierKeys: SubscriptionTier[] = ["solo", "practice", "provider", "enterprise"];

function normaliseTier(value: string | null): SubscriptionTier | null {
  if (value === "team") return "practice";
  if (value === "growth") return "provider";
  return subscriptionTierKeys.includes(value as SubscriptionTier) ? value as SubscriptionTier : null;
}

export function getRequestSubscriptionTier(request: Request): SubscriptionTier {
  return (
    normaliseTier(request.headers.get("x-empowernotes-tier")) ||
    normaliseTier(process.env.EMPOWERNOTES_DEFAULT_TIER || null) ||
    defaultSubscriptionTier
  );
}

export function checkRequestEntitlement(request: Request, entitlement: PlanToProgressEntitlementKey) {
  const tier = getRequestSubscriptionTier(request);
  const allowed = Boolean(getPlanToProgressEntitlements(tier)[entitlement]);

  return {
    allowed,
    tier,
    tierName: subscriptionTiers[tier].name,
    message: allowed ? "" : `${humaniseEntitlement(entitlement)} is available on a higher EmpowerNotes plan.`
  };
}

function humaniseEntitlement(entitlement: string) {
  return entitlement.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
