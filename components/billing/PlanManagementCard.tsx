import { Card } from "@/components/ui";

export function PlanManagementCard() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Plan Management</h2>
      <p className="mt-2 text-slate-700">Current plan: Practice Plan. Billing details are shown only to owner, admin, and service manager roles.</p>
      <a href="/admin/billing" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-ink px-4 text-sm font-semibold text-white">Manage Plan</a>
      <p className="mt-3 text-xs text-slate-500">Stripe checkout can be connected here when payment processing is configured.</p>
    </Card>
  );
}
