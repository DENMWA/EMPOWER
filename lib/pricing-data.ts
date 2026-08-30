import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

export type Plan = {
  tier: SubscriptionTier;
  name: string;
  shortName: string;
  price: string;
  userLimit: string;
  audience: string;
  bestFor: string;
  features: string[];
  stepUp: string;
  cta: string;
  href: string;
  highlighted?: boolean;
  selfService: boolean;
};

export const plans: Plan[] = [
  {
    tier: "solo",
    name: "EmpowerNotes Solo",
    shortName: "Solo",
    price: "A$49.99/month",
    userLimit: "1 active user",
    audience: "Independent providers",
    bestFor: "For independent providers who need clean notes, client records, documents, incidents and basic billing readiness.",
    features: ["AI progress notes", "Incident reports", "Client profiles", "Document uploads", "Basic billing readiness", "PDF downloads"],
    stepUp: "Start lean",
    cta: "Start Solo",
    href: "/signup?plan=solo",
    selfService: true
  },
  {
    tier: "practice",
    name: "EmpowerNotes Practice",
    shortName: "Practice",
    price: "A$129.99/month",
    userLimit: "Up to 5 active users",
    audience: "Small support teams",
    bestFor: "For small teams that need shared records, staff invitations, manager review, rostering and branded reports.",
    features: ["Everything in Solo", "Staff invitations", "Manager note review", "Team roster", "Staff sign on/off", "Document expiry reminders"],
    stepUp: "Most popular",
    cta: "Start Practice",
    href: "/signup?plan=practice",
    highlighted: true,
    selfService: true
  },
  {
    tier: "provider",
    name: "EmpowerNotes Provider",
    shortName: "Provider",
    price: "A$299.99/month",
    userLimit: "Up to 20 active users",
    audience: "Growing organisations",
    bestFor: "For growing providers managing multiple workers, clients, houses, reporting, invoicing and operational governance.",
    features: ["Everything in Practice", "Multi-house rostering", "Advanced incident oversight", "Billing readiness dashboard", "Comparative charts", "Plan-to-progress intelligence"],
    stepUp: "Scale teams",
    cta: "Start Provider",
    href: "/signup?plan=provider",
    selfService: true
  },
  {
    tier: "enterprise",
    name: "EmpowerNotes Enterprise",
    shortName: "Enterprise",
    price: "Custom",
    userLimit: "Custom users",
    audience: "Multi-site governance",
    bestFor: "For larger or multi-site providers needing tailored roles, onboarding, governance, analytics and reporting control.",
    features: ["Custom onboarding", "Custom roles and permissions", "Multi-site reporting", "Advanced analytics", "Priority support", "Tailored governance setup"],
    stepUp: "Tailored",
    cta: "Contact Enterprise Sales",
    href: "/contact",
    selfService: false
  }
];

export function getPricingPlan(tier: SubscriptionTier) {
  return plans.find((plan) => plan.tier === tier)!;
}

export const selfServicePlans = plans.filter((plan) => plan.selfService);

export const foundingOffer = {
  name: "Founding Provider Offer",
  price: "A$129.99/month for up to 5 users",
  lockIn: "Locked for 12 months",
  features: ["Practice-style team setup", "Guided voice notes", "Manager approvals", "Incident assistant", "Audit pack generator", "Document Vault", "AI Evidence Reader", "Up to 5 active users"]
};
