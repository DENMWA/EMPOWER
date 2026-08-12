import { getCurrentOrganisationId, supabaseRequest } from "@/lib/supabase-rest";

export type ParticipantGoalRecord = {
  id: string;
  participantId: string;
  title: string;
  category: string;
  targetReviewDate: string;
};

type ParticipantGoalRow = {
  id: string;
  participant_id: string;
  title: string;
  category: string | null;
  target_review_date: string | null;
};

export async function getActiveParticipantGoals(participantId: string) {
  if (!participantId) return [];
  const result = await supabaseRequest<ParticipantGoalRow[]>("participant_goals", {
    query: `select=id,participant_id,title,category,target_review_date&participant_id=eq.${encodeURIComponent(participantId)}&status=eq.active&order=created_at.asc`
  });
  if (!result.data || result.error) return [];
  return result.data.map((row) => ({
    id: row.id,
    participantId: row.participant_id,
    title: row.title,
    category: row.category || "Participant goal",
    targetReviewDate: row.target_review_date || ""
  }));
}

export async function savePendingGoalEvidence(input: {
  participantId: string;
  progressNoteId: string;
  goalIds: string[];
  evidenceDate: string;
  evidenceText: string;
}) {
  if (!input.goalIds.length) return { saved: true, error: "" };
  const organisationId = await getCurrentOrganisationId();
  if (!organisationId) return { saved: false, error: "Your organisation could not be verified." };

  const result = await supabaseRequest<Array<{ id: string }>>("goal_evidence", {
    method: "POST",
    query: "on_conflict=participant_goal_id,source_type,source_id",
    prefer: "resolution=merge-duplicates,return=representation",
    body: input.goalIds.map((goalId) => ({
      organisation_id: organisationId,
      participant_id: input.participantId,
      participant_goal_id: goalId,
      source_type: "progress_note",
      source_id: input.progressNoteId,
      evidence_date: input.evidenceDate,
      evidence_text: input.evidenceText,
      verification_status: "pending"
    }))
  });
  return { saved: Boolean(result.data && !result.error), error: result.error };
}

