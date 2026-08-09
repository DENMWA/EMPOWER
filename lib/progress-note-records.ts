import { getCurrentOrganisationId, getCurrentUserId, supabaseRequest } from "@/lib/supabase-rest";

export type ProgressNoteRecordInput = {
  id: string;
  participantId: string;
  supportDate: string;
  startTime: string;
  endTime: string;
  supportType: string;
  roughNote: string;
  finalNote: string;
  missingDetails: string[];
  qualityScore: number;
  billingEvidenceScore: number;
};

export async function saveTenantProgressNote(input: ProgressNoteRecordInput) {
  const organisationId = await getCurrentOrganisationId();
  const staffId = getCurrentUserId();
  if (!organisationId || !staffId) return { savedToCloud: false, error: "Sign in before saving this shift note." };
  if (!input.participantId) return { savedToCloud: false, error: "Select a client before saving this shift note." };

  const result = await supabaseRequest<Array<{ id: string }>>("progress_notes", {
    method: "POST",
    query: "on_conflict=id",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: input.id,
      organisation_id: organisationId,
      participant_id: input.participantId,
      staff_id: staffId,
      support_date: input.supportDate,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      support_type: input.supportType,
      rough_note: input.roughNote,
      final_note: input.finalNote,
      input_method: "typed",
      status: "Draft",
      missing_details: input.missingDetails,
      risky_wording_flags: [],
      incident_flags: [],
      unresolved_incident_flags: [],
      ai_quality_score: Math.max(0, Math.min(100, Math.round(input.qualityScore))),
      billing_evidence_score: Math.max(0, Math.min(100, Math.round(input.billingEvidenceScore))),
      invoice_ready: false,
      owner_approved: false,
      updated_at: new Date().toISOString()
    }
  });

  return { savedToCloud: Boolean(result.data?.length && !result.error), error: result.error };
}
