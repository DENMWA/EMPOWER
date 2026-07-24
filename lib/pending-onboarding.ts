import { createCurrentUserOrganisation } from "@/lib/supabase-rest";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

const pendingOnboardingKey = "empowernotes:pending-onboarding";

export type PendingOnboarding = {
  organisationName: string;
  ownerName: string;
  ownerEmail: string;
  providerType: "organisation" | "sole_provider";
  subscriptionTier: SubscriptionTier;
  trialEndsAt: string;
};

export function savePendingOnboarding(input: PendingOnboarding) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(pendingOnboardingKey, JSON.stringify(input));
}

export function getPendingOnboarding(): PendingOnboarding | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(pendingOnboardingKey);
    return stored ? JSON.parse(stored) as PendingOnboarding : null;
  } catch {
    return null;
  }
}

export async function completePendingOnboarding() {
  const pending = getPendingOnboarding();
  if (!pending) return { completed: false, error: "" };

  const result = await createCurrentUserOrganisation(pending);
  if (result.error || !result.data) {
    return { completed: false, error: result.error || "Could not create the organisation workspace." };
  }

  window.localStorage.removeItem(pendingOnboardingKey);
  return { completed: true, error: "" };
}
