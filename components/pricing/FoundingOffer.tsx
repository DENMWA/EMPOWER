import { ButtonLink, Card, StatusBadge } from "@/components/ui";
import { foundingOffer } from "@/lib/pricing-data";

export function FoundingOffer() {
  return (
    <Card className="border-teal-500 bg-skySoft">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <StatusBadge label={foundingOffer.lockIn} tone="green" />
          <h2 className="mt-3 text-2xl font-bold text-ink">{foundingOffer.name}</h2>
          <p className="mt-2 text-xl font-bold text-sea">{foundingOffer.price}</p>
          <div className="mt-4 flex flex-wrap gap-2">{foundingOffer.features.map((feature) => <StatusBadge key={feature} label={feature} tone="blue" />)}</div>
        </div>
        <ButtonLink href="/contact">Claim Founding Offer</ButtonLink>
      </div>
    </Card>
  );
}
