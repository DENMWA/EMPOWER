import { ButtonLink, Card, StatusBadge } from "@/components/ui";
import { plans } from "@/lib/pricing-data";

export function PricingCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-4">
      {plans.map((plan) => (
        <Card key={plan.name} className={plan.highlighted ? "border-teal-500" : ""}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-ink">{plan.name}</h2>
            {plan.highlighted ? <StatusBadge label="Popular" tone="green" /> : null}
          </div>
          <p className="mt-3 text-2xl font-bold text-sea">{plan.price}</p>
          <p className="mt-3 min-h-24 text-sm leading-6 text-slate-700">{plan.bestFor}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {plan.features.map((feature) => <li key={feature}>- {feature}</li>)}
          </ul>
          <div className="mt-5"><ButtonLink href={plan.href}>{plan.cta}</ButtonLink></div>
        </Card>
      ))}
    </div>
  );
}
