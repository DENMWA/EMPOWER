import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ButtonLink, Card, StatusBadge } from "@/components/ui";
import { plans } from "@/lib/pricing-data";

export function PricingCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-4">
      {plans.map((plan) => (
        <Card key={plan.name} className={`relative flex min-h-[520px] flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lift ${plan.highlighted ? "border-teal-500 ring-2 ring-teal-100" : ""}`}>
          <div className={`absolute inset-x-0 top-0 h-1 ${plan.highlighted ? "bg-gradient-to-r from-teal-600 to-amber-500" : "bg-slate-100"}`} />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-ink">{plan.name.replace("EmpowerNotes ", "")}</h2>
            {plan.highlighted ? <StatusBadge label="Popular" tone="green" /> : null}
          </div>
          <p className="mt-3 text-3xl font-bold text-sea">{plan.price.replace("/month", "")}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">per month</p>
          <p className="mt-4 min-h-24 text-sm leading-6 text-slate-700">{plan.bestFor}</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {plan.features.slice(0, 5).map((feature) => (
              <li key={feature} className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            <ButtonLink href={plan.href}>
              <span className="inline-flex items-center gap-2">
                {plan.cta}
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </ButtonLink>
          </div>
        </Card>
      ))}
    </div>
  );
}
