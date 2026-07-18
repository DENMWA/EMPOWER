import type { GoalEvidencePoint, ParticipantGoalProgress, PlanExtraction } from "@/lib/plan-progress/types";

export const samplePlanExtractions: PlanExtraction[] = [
  {
    id: "extraction-goal-meal-prep",
    extractionType: "goal",
    title: "Increase independence with meal preparation",
    originalText: "Participant will build independence with simple meal preparation routines.",
    interpretedText: "Increase independence with meal preparation using prompts, safe food handling and step-by-step routine support.",
    sourcePage: 4,
    sourceSection: "NDIS goals",
    confidenceScore: 0.91,
    verificationStatus: "approved"
  },
  {
    id: "extraction-strategy-prompts",
    extractionType: "support_strategy",
    title: "Prompting strategy",
    originalText: "Use short verbal prompts and allow time to complete each step.",
    interpretedText: "Use short verbal prompts, wait time, and direct supervision when required.",
    sourcePage: 6,
    sourceSection: "Support strategies",
    confidenceScore: 0.88,
    verificationStatus: "approved"
  }
];

export const mealPreparationGoal: ParticipantGoalProgress = {
  id: "goal-meal-prep",
  participantId: "client-b",
  title: "Increase independence with meal preparation",
  baselineDescription: "Requires continuous verbal prompting and direct supervision.",
  baselineScore: 1.5,
  currentVerifiedScore: 3.5,
  reviewDate: "2026-09-30",
  category: "Daily living skills",
  evidence: [
    evidence("week-1", "2026-06-03", "Support Worker A", "Client B selected ingredients with moderate prompting.", 2, "Emerging Progress", false),
    evidence("week-2", "2026-06-10", "Support Worker A", "Client B prepared a sandwich with two verbal prompts.", 2.5, "Progress Observed", false),
    evidence("week-3", "2026-06-17", "Team Lead A", "Client B prepared a sandwich with one verbal prompt.", 3, "Progress Observed", false),
    evidence("week-3-contradiction", "2026-06-18", "Support Worker A", "Client B required substantial support due to fatigue during meal preparation.", 2, "Barrier Observed", true),
    evidence("week-4", "2026-06-24", "Service Manager A", "Client B prepared breakfast with minimal prompting and safe pacing.", 3.5, "Progress Observed", false)
  ]
};

export const participantProgressGoals = [mealPreparationGoal];

function evidence(id: string, date: string, worker: string, text: string, score: number, classification: GoalEvidencePoint["suggestedClassification"], contradictionFlag: boolean): GoalEvidencePoint {
  return {
    id,
    date,
    worker,
    text,
    score,
    sourceType: "progress_note",
    suggestedClassification: classification,
    verifiedClassification: classification,
    verificationStatus: "approved",
    contradictionFlag
  };
}
