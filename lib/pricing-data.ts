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
    price: "$49/month",
    bestFor: "Independent support workers, sole providers, social workers, support coordinators, and small practitioners.",
    features: ["Guided voice documentation", "AI progress notes", "Self-certification", "Invoice-readiness checks", "Participant/client profiles", "Plan-to-Progress basic chart", "Basic audit pack", "Up to 10 active participants/clients"],
    cta: "Start Free Trial",
    href: "/signup"
  },
  {
    name: "EmpowerNotes Team",
    price: "$149/month + $25 per active user/month",
    bestFor: "Small NDIS, disability, youth work, and community service teams.",
    features: ["Everything in Solo", "Manager approval workflow", "Incident report assistant", "Evidence strength scoring", "Goal-linking assistant", "Document Vault", "AI Evidence Reader", "Risk and missing-detail flags"],
    cta: "Book Demo",
    href: "/contact",
    highlighted: true
  },
  {
    name: "EmpowerNotes Growth",
    price: "$399/month + $35 per active user/month",
    bestFor: "Growing providers needing stronger oversight, audit readiness, and manager visibility.",
    features: ["Everything in Team", "Multi-document plan intelligence", "Custom progress scales", "Advanced document intelligence", "Scheduled progress reports", "Risk and incident trend reporting", "Priority support", "Higher AI usage allowance"],
    cta: "Book Demo",
    href: "/contact"
  },
  {
    name: "EmpowerNotes Enterprise",
    price: "Custom pricing from $2,500/month",
    bestFor: "Large providers, multi-site organisations, and complex compliance workflows.",
    features: ["Custom onboarding", "Board and executive reports", "Advanced permissions", "Data migration support", "Dedicated support", "Organisation-wide outcomes", "Organisation-specific AI wording rules"],
    cta: "Book Demo",
    href: "/contact"
  }
];

export const foundingOffer = {
  name: "Founding Provider Offer",
  price: "$199/month for up to 10 users",
  lockIn: "Locked for 12 months",
  features: ["Guided voice notes", "Manager approvals", "Incident assistant", "Audit pack generator", "Document Vault", "AI Evidence Reader", "Invoice-readiness checks", "Up to 10 active users"]
};
