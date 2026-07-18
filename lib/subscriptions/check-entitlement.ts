import { getPlanToProgressEntitlements, type PlanToProgressEntitlementKey } from "@/lib/subscriptions/entitlements";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

export function hasEntitlement(tier: SubscriptionTier, entitlement: PlanToProgressEntitlementKey) {
  return Boolean(getPlanToProgressEntitlements(tier)[entitlement]);
}

export function requireEntitlement(tier: SubscriptionTier, entitlement: PlanToProgressEntitlementKey) {
  if (!hasEntitlement(tier, entitlement)) {
    return {
      allowed: false,
      message: `${humaniseEntitlement(entitlement)} is available on a higher EmpowerNotes plan.`
    };
  }

  return { allowed: true, message: "" };
}

function humaniseEntitlement(entitlement: string) {
  return entitlement.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
