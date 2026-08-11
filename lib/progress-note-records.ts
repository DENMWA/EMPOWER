import { getCurrentOrganisationId, getCurrentUserId, supabaseRequest } from "@/lib/supabase-rest";
import { buildDocumentStoragePath, uploadTenantDocumentFile } from "@/lib/document-records";
import type { NoteQuality } from "@/lib/ai-mock";

export type ProgressNoteRecordInput = {
  id: string;
  participantId: string;
  supportDate: string;
  startTime: string;
  endTime: string;
  supportType: string;
  note: string;
  inputMethod?: "typed" | "standard_voice";
  missingDetails: string[];
  qualityScore: number;
  billingEvidenceScore: number;
  qualityBreakdown: NoteQuality;
  photoFiles?: File[];
};

export async function saveTenantProgressNote(input: ProgressNoteRecordInput) {
  const organisationId = await getCurrentOrganisationId();
  const staffId = getCurrentUserId();
  if (!organisationId || !staffId) return { savedToCloud: false, error: "Sign in before saving this shift note." };
  if (!input.participantId) return { savedToCloud: false, error: "Select a client before saving this shift note." };

  const photoEvidence: Array<{ path: string; name: string; type: string }> = [];
  for (const file of input.photoFiles || []) {
    const path = buildDocumentStoragePath({
      organisationId,
      participantId: input.participantId,
      documentType: `shift-note-evidence-${input.id}`,
      fileName: file.name
    });
    const upload = await uploadTenantDocumentFile(file, path);
    if (!upload.uploaded) return { savedToCloud: false, error: upload.error, bodyAppend: "" };
    photoEvidence.push({ path, name: file.name, type: file.type || "image" });
  }

  const noteBody = {
      id: input.id,
      organisation_id: organisationId,
      participant_id: input.participantId,
      staff_id: staffId,
      support_date: input.supportDate,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      support_type: input.supportType,
      rough_note: "",
      final_note: input.note,
      voice_transcript: null,
      input_method: input.inputMethod || "typed",
      status: "Submitted",
      missing_details: input.missingDetails,
      risky_wording_flags: [],
      incident_flags: [],
      unresolved_incident_flags: [],
      ai_quality_score: Math.max(0, Math.min(100, Math.round(input.qualityScore))),
      billing_evidence_score: Math.max(0, Math.min(100, Math.round(input.billingEvidenceScore))),
      quality_breakdown: input.qualityBreakdown,
      photo_evidence: photoEvidence,
      invoice_ready: false,
      owner_approved: false,
      updated_at: new Date().toISOString()
  };
  let result = await supabaseRequest<Array<{ id: string }>>("progress_notes", {
    method: "POST",
    query: "on_conflict=id",
    prefer: "resolution=merge-duplicates,return=representation",
    body: noteBody
  });

  // Keep advisory scoring from blocking a note during a staged database rollout.
  if (result.error.includes("quality_breakdown")) {
    const { quality_breakdown: _qualityBreakdown, ...compatibleBody } = noteBody;
    result = await supabaseRequest<Array<{ id: string }>>("progress_notes", {
      method: "POST",
      query: "on_conflict=id",
      prefer: "resolution=merge-duplicates,return=representation",
      body: compatibleBody
    });
  }

  return {
    savedToCloud: Boolean(result.data?.length && !result.error),
    error: result.error,
    bodyAppend: photoEvidence.length ? `\n\nPhoto evidence:\n${photoEvidence.map((photo) => `- ${photo.path}`).join("\n")}` : ""
  };
}
