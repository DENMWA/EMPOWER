export type SubscriptionTier = "solo" | "practice" | "provider" | "enterprise";

export const subscriptionTiers: Record<SubscriptionTier, { name: string; shortName: string }> = {
  solo: { name: "EmpowerNotes Solo", shortName: "Solo" },
  practice: { name: "EmpowerNotes Practice", shortName: "Practice" },
  provider: { name: "EmpowerNotes Provider", shortName: "Provider" },
  enterprise: { name: "EmpowerNotes Enterprise", shortName: "Enterprise" }
};

export const defaultSubscriptionTier: SubscriptionTier = "practice";
