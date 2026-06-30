import type { Metadata } from "next";
import { FoundingOffer } from "@/components/pricing/FoundingOffer";
import { PlanComparison } from "@/components/pricing/PlanComparison";
import { PricingCards } from "@/components/pricing/PricingCards";
import { PricingFAQ } from "@/components/pricing/PricingFAQ";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Pricing for Australian NDIS Documentation Software",
  description:
    "Simple EmpowerNotes pricing for Australian NDIS providers, disability support teams, social workers, youth workers, and community service organisations that need audit-ready documentation.",
  alternates: {
    canonical: "/pricing"
  }
};

export default function PricingPage() {
  return (
    <>
      <PageHeader
        title="Simple pricing for Australian NDIS documentation, safer records, and stronger audit evidence."
        description="EmpowerNotes helps Australian disability support, youth work, social work, NDIS, and community service providers turn rough notes, voice notes, incident details, and support documents into clear, person-centred, evidence-backed records."
      />
      <Section><FoundingOffer /></Section>
      <Section><PricingCards /></Section>
      <Section><PlanComparison /></Section>
      <Section><PricingFAQ /></Section>
    </>
  );
}
