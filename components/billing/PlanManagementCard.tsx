import { Card } from "@/components/ui";

export function PlanManagementCard() {
  const upgradeOptions = [
    { name: "Provider", detail: "For multi-team operations, configurable dashboards, and scheduled reports." },
    { name: "Enterprise", detail: "For SSO, integrations, custom governance, and organisation-wide intelligence." }
  ];

  return (
    <Card>
      <p className="text-sm font-semibold uppercase tracking-wide text-sea">Admin plan control</p>
      <h2 className="mt-1 text-xl font-semibold text-ink">Current plan: Practice Plan</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">Billing and subscription controls are visible only in admin. Workers and employees do not see pricing or plan controls in the main app.</p>

      <div className="mt-4 grid gap-3">
        {upgradeOptions.map((option) => (
          <div key={option.name} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-ink">Upgrade to {option.name}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{option.detail}</p>
          </div>
        ))}
      </div>

      <a href="/pricing" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-ink px-4 text-sm font-semibold text-white">View upgrade options</a>
      <p className="mt-3 text-xs text-slate-500">Stripe checkout can be connected here when payment processing is configured.</p>
    </Card>
  );
}
