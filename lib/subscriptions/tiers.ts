export type SubscriptionTier = "solo" | "team" | "growth" | "enterprise";

export const subscriptionTiers: Record<SubscriptionTier, { name: string; shortName: string }> = {
  solo: { name: "EmpowerNotes Solo", shortName: "Solo" },
  team: { name: "EmpowerNotes Team", shortName: "Team" },
  growth: { name: "EmpowerNotes Growth", shortName: "Growth" },
  enterprise: { name: "EmpowerNotes Enterprise", shortName: "Enterprise" }
};

export const defaultSubscriptionTier: SubscriptionTier = "team";
