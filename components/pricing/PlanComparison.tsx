import { Card } from "@/components/ui";

const rows = [
  ["Guided voice documentation", "Yes", "Yes", "Yes", "Yes"],
  ["Plan-to-Progress Intelligence", "Basic", "Team review", "Advanced", "Enterprise"],
  ["Evidence-strength scoring", "No", "Yes", "Yes", "Custom"],
  ["Manager approvals", "No", "Yes", "Yes", "Advanced"],
  ["Document Intelligence", "Basic", "Yes", "Advanced", "Custom"],
  ["Audit packs", "Basic", "Standard", "Advanced", "Custom"],
  ["Permissions", "Owner", "Team", "Multi-site", "Advanced"]
];

export function PlanComparison() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-ink">Plan Comparison</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead><tr className="border-b"><th className="py-3">Feature</th><th>Solo</th><th>Team</th><th>Growth</th><th>Enterprise</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row[0]} className="border-b border-slate-100">{row.map((cell, index) => <td key={`${row[0]}-${index}`} className="py-3 pr-4">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}
