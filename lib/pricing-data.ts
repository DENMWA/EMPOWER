export type Plan = {
  name: string;
  price: string;
  bestFor: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

export const plans: Plan[] = [
  {
    name: "EmpowerNotes Solo",
    price: "A$49.99/month",
    bestFor: "For independent providers who need audit-ready notes, participant records, plan parsing, and basic progress evidence.",
    features: ["1 user", "Up to 10 active participants", "AI notes and voice documentation", "Plan parsing and goal extraction", "Goal-linked notes", "Self-reviewed baselines", "Basic progress charts", "Participant progress reports"],
    cta: "Start Solo",
    href: "/signup"
  },
  {
    name: "EmpowerNotes Practice",
    price: "A$129.99/month",
    bestFor: "For small support teams and practices that need manager review, staff oversight, and stronger participant progress evidence.",
    features: ["10 users included", "Up to 50 active participants", "Manager review workflow", "Evidence-strength scoring", "Staff documentation oversight", "Goal evidence alerts", "Branded reports", "Support-level trends"],
    cta: "Start Practice",
    href: "/contact",
    highlighted: true
  },
  {
    name: "EmpowerNotes Provider",
    price: "A$299.99/month",
    bestFor: "For growing providers that need standardised documentation, custom workflows, service reporting, and operational control.",
    features: ["Multi-team operations", "Custom workflows and templates", "Multi-document participant intelligence", "Custom progress scales", "Organisation dashboards", "Scheduled reports", "Integration options", "Multi-location support"],
    cta: "Book Demo",
    href: "/contact"
  },
  {
    name: "EmpowerNotes Enterprise",
    price: "A$799.99/month",
    bestFor: "For large and multi-site organisations requiring governance, integrations, security controls, and organisation-wide intelligence.",
    features: ["Automated document ingestion", "Organisation-wide outcomes analytics", "Microsoft Teams integration", "Executive dashboards", "SSO and custom roles", "API and data warehouse access", "Full white-label", "Dedicated implementation"],
    cta: "Contact Enterprise Sales",
    href: "/contact"
  }
];

export const foundingOffer = {
  name: "Founding Provider Offer",
  price: "A$129.99/month for up to 10 users",
  lockIn: "Locked for 12 months",
  features: ["Practice-style team setup", "Guided voice notes", "Manager approvals", "Incident assistant", "Audit pack generator", "Document Vault", "AI Evidence Reader", "Up to 10 active users"]
};
