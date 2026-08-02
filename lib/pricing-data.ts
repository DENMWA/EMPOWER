import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

export type Plan = {
  tier: SubscriptionTier;
  name: string;
  shortName: string;
  price: string;
  bestFor: string;
  features: string[];
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
    bestFor: "For independent providers who need audit-ready notes, participant records, plan parsing, and basic progress evidence.",
    features: ["1 user", "Up to 10 active participants", "AI notes and voice documentation", "Plan parsing and goal extraction", "Goal-linked notes", "Self-reviewed baselines", "Basic progress charts", "Participant progress reports"],
    cta: "Start Solo",
    href: "/signup?plan=solo",
    selfService: true
  },
  {
    tier: "practice",
    name: "EmpowerNotes Practice",
    shortName: "Practice",
    price: "A$129.99/month",
    bestFor: "For small support teams and practices that need manager review, staff oversight, and stronger participant progress evidence.",
    features: ["10 users included", "Up to 50 active participants", "Manager review workflow", "Evidence-strength scoring", "Staff documentation oversight", "Goal evidence alerts", "Branded reports", "Support-level trends"],
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
    bestFor: "For growing providers that need standardised documentation, custom workflows, service reporting, and operational control.",
    features: ["Multi-team operations", "Custom workflows and templates", "Multi-document participant intelligence", "Custom progress scales", "Organisation dashboards", "Scheduled reports", "Advanced budget forecasting", "Multi-location support"],
    cta: "Start Provider",
    href: "/signup?plan=provider",
    selfService: true
  },
  {
    tier: "enterprise",
    name: "EmpowerNotes Enterprise",
    shortName: "Enterprise",
    price: "Custom",
    bestFor: "For large and multi-site organisations requiring tailored governance, implementation support, security controls, and organisation-wide intelligence.",
    features: ["Structured implementation", "Organisation-wide outcomes analytics", "Executive dashboards", "Role-based governance", "Board-ready reporting", "Custom governance configuration", "White-label options", "Dedicated implementation support"],
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
  price: "A$129.99/month for up to 10 users",
  lockIn: "Locked for 12 months",
  features: ["Practice-style team setup", "Guided voice notes", "Manager approvals", "Incident assistant", "Audit pack generator", "Document Vault", "AI Evidence Reader", "Up to 10 active users"]
};
