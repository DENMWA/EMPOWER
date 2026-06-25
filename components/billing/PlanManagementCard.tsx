import { Card } from "@/components/ui";

export function PlanManagementCard() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Plan Management</h2>
      <p className="mt-2 text-slate-700">Current plan: Team Plan. Billing details are shown only to owner, admin, and service manager roles.</p>
      <button className="mt-4 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white">Manage Plan</button>
      <p className="mt-3 text-xs text-slate-500">Stripe checkout can be connected here when payment processing is configured.</p>
    </Card>
  );
}
