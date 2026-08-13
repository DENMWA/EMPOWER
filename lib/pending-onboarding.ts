import { createCurrentUserOrganisation } from "@/lib/supabase-rest";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { getMarketingVisitorId } from "@/lib/marketing/client";
import { getAuthenticatedApiHeaders } from "@/lib/supabase-auth";

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
    if (result.error) {
      console.error("Organisation workspace creation failed:", result.error);
    }
    return {
      completed: false,
      error: "We could not finish setting up your workspace. Please try again shortly or contact support."
    };
  }

  const visitorId = getMarketingVisitorId();
  if (visitorId) {
    void fetch("/api/marketing/signup", {
      method: "POST",
      headers: { ...getAuthenticatedApiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId })
    }).catch(() => undefined);
  }

  window.localStorage.removeItem(pendingOnboardingKey);
  return { completed: true, error: "" };
}
