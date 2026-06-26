import { ButtonLink, Card, StatusBadge } from "@/components/ui";
import { plans } from "@/lib/pricing-data";

export function PricingCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-4">
      {plans.map((plan) => (
        <Card key={plan.name} className={`relative overflow-hidden ${plan.highlighted ? "border-teal-500 ring-2 ring-teal-100" : ""}`}>
          {plan.highlighted ? <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-600 to-amber-500" /> : null}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-ink">{plan.name}</h2>
            {plan.highlighted ? <StatusBadge label="Popular" tone="green" /> : null}
          </div>
          <p className="mt-3 text-2xl font-bold text-sea">{plan.price}</p>
          <p className="mt-3 min-h-24 text-sm leading-6 text-slate-700">{plan.bestFor}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {plan.features.map((feature) => <li key={feature} className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-sea" /> <span>{feature}</span></li>)}
          </ul>
          <div className="mt-5"><ButtonLink href={plan.href}>{plan.cta}</ButtonLink></div>
        </Card>
      ))}
    </div>
  );
}
