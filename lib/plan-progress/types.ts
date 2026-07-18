export type ProgressClassification =
  | "Insufficient Evidence"
  | "Baseline Established"
  | "Maintaining"
  | "Emerging Progress"
  | "Progress Observed"
  | "Sustained Progress"
  | "Goal Achieved"
  | "Barrier Observed"
  | "Regression Concern"
  | "Review Required";

export type VerificationStatus = "pending" | "approved" | "edited" | "rejected";

export interface PlanExtraction {
  id: string;
  extractionType: "goal" | "support_need" | "risk" | "support_strategy" | "baseline_indicator";
  title: string;
  originalText: string;
  interpretedText: string;
  sourcePage: number;
  sourceSection: string;
  confidenceScore: number;
  verificationStatus: VerificationStatus;
}

export interface ParticipantGoalProgress {
  id: string;
  participantId: string;
  title: string;
  baselineDescription: string;
  baselineScore: number;
  currentVerifiedScore: number;
  reviewDate: string;
  category: string;
  evidence: GoalEvidencePoint[];
}

export interface GoalEvidencePoint {
  id: string;
  date: string;
  sourceType: "progress_note" | "incident" | "meal_record" | "manual_observation";
  worker: string;
  text: string;
  score: number;
  suggestedClassification: ProgressClassification;
  verifiedClassification?: ProgressClassification;
  verificationStatus: VerificationStatus;
  contradictionFlag: boolean;
}

export interface EvidenceStrengthResult {
  score: number;
  label: "Weak" | "Limited" | "Moderate" | "Strong";
  supportingFactors: string[];
  limitingFactors: string[];
  contradictoryEvidenceCount: number;
  observationCount: number;
  distinctStaffCount: number;
  observationPeriodDays: number;
}
