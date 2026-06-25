import { FoundingOffer } from "@/components/pricing/FoundingOffer";
import { PlanComparison } from "@/components/pricing/PlanComparison";
import { PricingCards } from "@/components/pricing/PricingCards";
import { PricingFAQ } from "@/components/pricing/PricingFAQ";
import { PageHeader, Section } from "@/components/ui";

export default function PricingPage() {
  return (
    <>
      <PageHeader
        title="Simple pricing for better documentation, safer records, and stronger audit evidence."
        description="Empower helps disability, youth work, social work, and community service providers turn rough notes, voice notes, incident details, and support documents into clear, person-centred, evidence-backed records."
      />
      <Section><FoundingOffer /></Section>
      <Section><PricingCards /></Section>
      <Section><PlanComparison /></Section>
      <Section><PricingFAQ /></Section>
    </>
  );
}
