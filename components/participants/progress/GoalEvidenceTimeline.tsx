import { StatusBadge } from "@/components/ui";
import type { GoalEvidencePoint } from "@/lib/plan-progress/types";

export function GoalEvidenceTimeline({ evidence }: { evidence: GoalEvidencePoint[] }) {
  return (
    <div className="space-y-3">
      {evidence.map((item) => (
        <div key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold text-ink">{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-AU")}</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label={item.verifiedClassification ?? item.suggestedClassification} tone={item.contradictionFlag ? "amber" : "green"} />
              {item.contradictionFlag ? <StatusBadge label="Contradiction" tone="red" /> : null}
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{item.text}</p>
          <p className="mt-2 text-xs text-slate-500">Source: {item.sourceType.replace("_", " ")} | Worker: {item.worker} | Score: {item.score}</p>
        </div>
      ))}
    </div>
  );
}
