import type { Metadata } from "next";
import { PricingCards } from "@/components/pricing/PricingCards";
import { PageHeader, Section, StatusBadge } from "@/components/ui";
import { CheckCircle2 } from "lucide-react";

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
        eyebrow="Plans"
        title="Choose the right EmpowerNotes plan"
        description="Start with 14 days free. Choose the level that fits your service now, then upgrade as your team, clients, houses, reporting, and billing needs grow."
      />
      <Section>
        <div className="rounded-md border border-teal-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="14-day trial" tone="green" />
            <StatusBadge label="No card during early testing" tone="blue" />
            <StatusBadge label="Cancel or export data anytime" tone="slate" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              "Private by design.",
              "Your team. Your clients. Your workspace.",
              "Workers see only what they need."
            ].map((item) => (
              <p key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" />
                <span>{item}</span>
              </p>
            ))}
          </div>
        </div>
      </Section>
      <Section><PricingCards /></Section>
      <Section>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">After signup</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Set up the workspace in five steps.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {["Organisation details", "House/service", "Clients", "Staff invites", "First note"].map((step, index) => (
              <div key={step} className="rounded-md bg-white p-4 shadow-soft">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-sm font-bold text-white">{index + 1}</span>
                <p className="mt-3 text-sm font-semibold text-ink">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
