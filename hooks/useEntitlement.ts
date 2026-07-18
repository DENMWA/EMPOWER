"use client";

import { useEffect, useState } from "react";
import { getPlanToProgressEntitlements, type PlanToProgressEntitlementKey } from "@/lib/subscriptions/entitlements";
import { defaultSubscriptionTier, type SubscriptionTier } from "@/lib/subscriptions/tiers";

const tierStorageKey = "empowernotes:subscription-tier";
const subscriptionTierKeys: SubscriptionTier[] = ["solo", "team", "growth", "enterprise"];

function isSubscriptionTier(value: string | null): value is SubscriptionTier {
  return Boolean(value && subscriptionTierKeys.includes(value as SubscriptionTier));
}

export function getCurrentSubscriptionTier(): SubscriptionTier {
  if (typeof window === "undefined") return defaultSubscriptionTier;
  const stored = window.localStorage.getItem(tierStorageKey);
  return isSubscriptionTier(stored) ? stored : defaultSubscriptionTier;
}

export function setCurrentSubscriptionTier(tier: SubscriptionTier) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(tierStorageKey, tier);
}

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
