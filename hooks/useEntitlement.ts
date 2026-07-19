"use client";

import { useEffect, useState } from "react";
import { getPlanToProgressEntitlements, type PlanToProgressEntitlementKey } from "@/lib/subscriptions/entitlements";
import { defaultSubscriptionTier, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import { getCurrentSubscriptionTier, setCurrentSubscriptionTier } from "@/lib/subscriptions/browser-tier";

export function useEntitlement(entitlement?: PlanToProgressEntitlementKey) {
  const [tier, setTier] = useState<SubscriptionTier>(defaultSubscriptionTier);

  useEffect(() => {
    setTier(getCurrentSubscriptionTier());
  }, []);

  const entitlements = getPlanToProgressEntitlements(tier);
  return {
    tier,
    setTier: (nextTier: SubscriptionTier) => {
      setCurrentSubscriptionTier(nextTier);
      setTier(nextTier);
    },
    entitlements,
    allowed: entitlement ? Boolean(entitlements[entitlement]) : entitlements.enabled
  };
}
