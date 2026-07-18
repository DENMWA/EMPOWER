import { Card, StatusBadge } from "@/components/ui";
import { calculateEvidenceStrength, classifyProgressFromEvidence } from "@/lib/plan-progress/scoring";
import type { ParticipantGoalProgress } from "@/lib/plan-progress/types";
import { EvidenceStrengthPanel } from "@/components/participants/progress/EvidenceStrengthPanel";
import { GoalEvidenceTimeline } from "@/components/participants/progress/GoalEvidenceTimeline";
import { GoalProgressChart } from "@/components/participants/progress/GoalProgressChart";

export function GoalProgressCard({ goal }: { goal: ParticipantGoalProgress }) {
  const strength = calculateEvidenceStrength(goal.evidence);
  const classification = classifyProgressFromEvidence(goal);
  const approvedCount = goal.evidence.filter((item) => item.verificationStatus === "approved").length;

  return (
    <div className="space-y-4">
      <Card className="border-teal-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Verified goal</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">{goal.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Baseline: {goal.baselineDescription}</p>
          </div>
          <StatusBadge label={classification} tone={classification === "Review Required" ? "amber" : "green"} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Baseline level" value={goal.baselineScore} />
          <Metric label="Current verified level" value={goal.currentVerifiedScore} />
          <Metric label="Approved observations" value={approvedCount} />
          <Metric label="Review date" value={new Date(`${goal.reviewDate}T00:00:00`).toLocaleDateString("en-AU")} />
        </div>
        <div className="mt-5 rounded-md border border-amber-100 bg-amber-50/80 p-3 text-sm leading-6 text-amber-950">
          The available documentation suggests possible progress. Authorised review is required before updating the verified progress level. Improvement during one support session does not establish sustained progress.
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <GoalProgressChart goal={goal} />
        <EvidenceStrengthPanel result={strength} />
      </div>
      <Card>
        <h2 className="text-xl font-semibold text-ink">Evidence timeline</h2>
        <div className="mt-4"><GoalEvidenceTimeline evidence={goal.evidence} /></div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
