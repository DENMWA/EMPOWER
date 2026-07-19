import { defaultSubscriptionTier, type SubscriptionTier } from "@/lib/subscriptions/tiers";

export const tierStorageKey = "empowernotes:subscription-tier";
const subscriptionTierKeys: SubscriptionTier[] = ["solo", "practice", "provider", "enterprise"];

function migrateLegacyTier(value: string | null): SubscriptionTier | null {
  if (value === "team") return "practice";
  if (value === "growth") return "provider";
  return null;
}

export function isSubscriptionTier(value: string | null): value is SubscriptionTier {
  return Boolean(value && subscriptionTierKeys.includes(value as SubscriptionTier));
}

export function getCurrentSubscriptionTier(): SubscriptionTier {
  if (typeof window === "undefined") return defaultSubscriptionTier;
  const stored = window.localStorage.getItem(tierStorageKey);
  const migrated = migrateLegacyTier(stored);
  if (migrated) {
    setCurrentSubscriptionTier(migrated);
    return migrated;
  }

  return isSubscriptionTier(stored) ? stored : defaultSubscriptionTier;
}

export function setCurrentSubscriptionTier(tier: SubscriptionTier) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(tierStorageKey, tier);
}
