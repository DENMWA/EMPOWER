import { Card, StatusBadge } from "@/components/ui";
import type { EvidenceStrengthResult } from "@/lib/plan-progress/types";

export function EvidenceStrengthPanel({ result }: { result: EvidenceStrengthResult }) {
  return (
    <Card className="border-sky-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Evidence strength</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{result.label} evidence</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Score: {result.score}/100. This score is explainable and must be reviewed with the supporting and limiting factors below.</p>
        </div>
        <StatusBadge label={`${result.observationCount} observations`} tone="blue" />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-ink">Supporting factors</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {result.supportingFactors.map((factor) => <li key={factor}>{factor}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Limiting factors</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {result.limitingFactors.length ? result.limitingFactors.map((factor) => <li key={factor}>{factor}</li>) : <li>No major limiting factor identified.</li>}
          </ul>
        </div>
      </div>
    </Card>
  );
}
