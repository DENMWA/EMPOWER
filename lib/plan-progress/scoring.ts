import type { EvidenceStrengthResult, GoalEvidencePoint, ParticipantGoalProgress, ProgressClassification } from "@/lib/plan-progress/types";

const protectedClassifications: ProgressClassification[] = ["Goal Achieved", "Regression Concern", "Sustained Progress"];

export function classifyProgressFromEvidence(goal: ParticipantGoalProgress): ProgressClassification {
  const approved = goal.evidence.filter((item) => item.verificationStatus === "approved");
  if (!approved.length) return "Insufficient Evidence";
  if (approved.length === 1) return "Baseline Established";
  if (approved.some((item) => item.contradictionFlag)) return "Review Required";

  const latest = approved[approved.length - 1];
  if (!latest) return "Insufficient Evidence";
  if (latest.score > goal.baselineScore + 1) return "Progress Observed";
  if (latest.score > goal.baselineScore) return "Emerging Progress";
  return "Maintaining";
}

export function canAiAutoSuggest(classification: ProgressClassification) {
  return !protectedClassifications.includes(classification);
}

export function calculateEvidenceStrength(evidence: GoalEvidencePoint[]): EvidenceStrengthResult {
  const approved = evidence.filter((item) => item.verificationStatus === "approved");
  const contradictoryEvidenceCount = approved.filter((item) => item.contradictionFlag).length;
  const distinctStaffCount = new Set(approved.map((item) => item.worker)).size;
  const dates = approved.map((item) => new Date(`${item.date}T00:00:00`).getTime()).sort((a, b) => a - b);
  const observationPeriodDays = dates.length > 1 ? Math.round((dates[dates.length - 1] - dates[0]) / 86400000) : 0;

  let score = 20;
  score += Math.min(approved.length * 12, 36);
  score += Math.min(distinctStaffCount * 8, 24);
  score += observationPeriodDays >= 21 ? 15 : observationPeriodDays >= 7 ? 8 : 0;
  score -= contradictoryEvidenceCount * 12;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    label: score >= 75 ? "Strong" : score >= 55 ? "Moderate" : score >= 35 ? "Limited" : "Weak",
    supportingFactors: [
      `${approved.length} approved observations`,
      `${distinctStaffCount} different staff member${distinctStaffCount === 1 ? "" : "s"}`,
      `${observationPeriodDays} days of observation history`
    ],
    limitingFactors: [
      contradictoryEvidenceCount ? `${contradictoryEvidenceCount} contradictory observation requires review` : "",
      approved.length < 4 ? "More approved observations would strengthen the trend" : ""
    ].filter(Boolean),
    contradictoryEvidenceCount,
    observationCount: approved.length,
    distinctStaffCount,
    observationPeriodDays
  };
}
