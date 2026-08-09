"use client";

import { useState } from "react";
import type { ParticipantGoalProgress } from "@/lib/plan-progress/types";

export function GoalProgressChart({ goal }: { goal: ParticipantGoalProgress }) {
  const points = [{ label: "Baseline", score: goal.baselineScore }, ...goal.evidence.map((item, index) => ({ label: `Week ${index + 1}`, score: item.score }))];
  const [selectedIndex, setSelectedIndex] = useState(points.length - 1);
  const selectedPoint = points[selectedIndex] || points[0];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-ink">Progress trend</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">Baseline compared with verified evidence. Chart values are also listed in the table below.</p>
      <div className="mt-4 flex h-52 items-end gap-3 border-b border-l border-slate-300 px-3 pt-3" aria-label="Select a progress point to view its verified score.">
        {points.map((point, index) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`w-full rounded-t-md transition hover:bg-teal-700 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${selectedIndex === index ? "bg-sea shadow-lift" : "bg-teal-500"}`}
              style={{ height: `${Math.max(point.score * 34, 12)}px` }}
              aria-label={`${point.label}: verified score ${point.score}`}
              aria-pressed={selectedIndex === index}
            />
            <span className="text-xs font-semibold text-slate-600">{point.score}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Selected point</p>
        <p className="mt-1 font-semibold text-ink">{selectedPoint.label}: {selectedPoint.score} verified score</p>
      </div>
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Point</th><th className="py-2">Verified score</th></tr></thead>
        <tbody>{points.map((point) => <tr key={point.label} className="border-t border-slate-100"><td className="py-2">{point.label}</td><td className="py-2">{point.score}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
