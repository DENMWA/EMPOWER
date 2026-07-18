import type { ParticipantGoalProgress } from "@/lib/plan-progress/types";

export function GoalProgressChart({ goal }: { goal: ParticipantGoalProgress }) {
  const points = [{ label: "Baseline", score: goal.baselineScore }, ...goal.evidence.map((item, index) => ({ label: `Week ${index + 1}`, score: item.score }))];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-ink">Progress trend</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">Baseline compared with verified evidence. Chart values are also listed in the table below.</p>
      <div className="mt-4 flex h-52 items-end gap-3 border-b border-l border-slate-300 px-3 pt-3" role="img" aria-label="Bar chart showing meal preparation support level improving from baseline 1.5 to week four 3.5, with one contradictory lower observation in week three.">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full rounded-t-md bg-teal-600" style={{ height: `${Math.max(point.score * 34, 12)}px` }} />
            <span className="text-xs font-semibold text-slate-600">{point.score}</span>
          </div>
        ))}
      </div>
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Point</th><th className="py-2">Verified score</th></tr></thead>
        <tbody>{points.map((point) => <tr key={point.label} className="border-t border-slate-100"><td className="py-2">{point.label}</td><td className="py-2">{point.score}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
