import { Card } from "@/components/ui";
import { plans } from "@/lib/pricing-data";
import { planCatalogue } from "@/lib/subscriptions/catalog";

const rows = [
  ["Guided voice documentation", ...plans.map(() => "Yes")],
  ["Plan parsing", ...plans.map((plan) => planCatalogue[plan.tier].intelligence.basicPlanParsing ? "Yes" : "No")],
  ["Evidence-strength scoring", ...plans.map((plan) => planCatalogue[plan.tier].intelligence.evidenceStrengthScoring ? "Yes" : "No")],
  ["Manager approvals", ...plans.map((plan) => planCatalogue[plan.tier].operations.managerReview ? "Yes" : "No")],
  ["Audit packs", ...plans.map((plan) => planCatalogue[plan.tier].operations.auditPacks ? "Yes" : "No")],
  ["Team rostering", ...plans.map((plan) => planCatalogue[plan.tier].billing.teamScheduling ? "Yes" : "No")],
  ["Houses/services", ...plans.map((plan) => formatLimit(planCatalogue[plan.tier].limits.houses))],
  ["Active clients", ...plans.map((plan) => formatLimit(planCatalogue[plan.tier].limits.activeParticipants))],
  ["Users", ...plans.map((plan) => formatLimit(planCatalogue[plan.tier].limits.users))]
];

export function PlanComparison() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Plan Comparison</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead><tr className="border-b"><th className="py-3">Feature</th>{plans.map((plan) => <th key={plan.tier}>{plan.shortName}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row[0]} className="border-b border-slate-100">{row.map((cell, index) => <td key={`${row[0]}-${index}`} className="py-3 pr-4">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}

function formatLimit(limit: number | null) {
  return limit === null ? "Custom" : limit.toLocaleString("en-AU");
}
