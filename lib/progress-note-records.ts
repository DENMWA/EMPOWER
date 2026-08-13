import { getCurrentOrganisationId, getCurrentUserId, supabaseRequest } from "@/lib/supabase-rest";
import { buildDocumentStoragePath, uploadTenantDocumentFile } from "@/lib/document-records";
import type { NoteQuality } from "@/lib/ai-mock";
import { savePendingGoalEvidence } from "@/lib/plan-progress/goal-records";

export type ProgressNoteRecordInput = {
  id: string;
  participantId: string;
  supportDate: string;
  startTime: string;
  endTime: string;
  supportType: string;
  note: string;
  inputMethod?: "typed" | "voice" | "mixed";
  status?: "Draft" | "Submitted";
  originalInput: string;
  voiceTranscript: string;
  workingDraft: string;
  aiImprovedVersion: string | null;
  finalApprovedVersion: string | null;
  missingDetails: string[];
  qualityScore: number;
  billingEvidenceScore: number;
  qualityBreakdown: NoteQuality;
  photoFiles?: File[];
  linkedGoalIds?: string[];
};

export type WorkerProgressNote = {
  id: string;
  participantId: string;
  staffId: string;
  supportDate: string;
  startTime: string;
  endTime: string;
  supportType: string;
  status: string;
  body: string;
  photoPaths: string[];
  updatedAt: string;
  isOwn: boolean;
};

type WorkerProgressNoteRow = {
  id: string;
  participant_id: string;
  staff_id: string;
  support_date: string;
  start_time: string | null;
  end_time: string | null;
  support_type: string;
  status: string;
  final_note: string | null;
  rough_note: string;
  photo_evidence: Array<{ path?: string }> | null;
  updated_at: string;
};

export async function getTenantWorkerProgressNotes() {
  const currentUserId = getCurrentUserId();
  const result = await supabaseRequest<WorkerProgressNoteRow[]>("progress_notes", {
    query: "select=id,participant_id,staff_id,support_date,start_time,end_time,support_type,status,final_note,rough_note,photo_evidence,updated_at&order=updated_at.desc"
  });
  if (!result.data || result.error) return { records: [] as WorkerProgressNote[], error: result.error };
  return {
    records: result.data.map((row) => ({
      id: row.id,
      participantId: row.participant_id,
      staffId: row.staff_id,
      supportDate: row.support_date,
      startTime: row.start_time || "",
      endTime: row.end_time || "",
      supportType: row.support_type,
      status: row.status,
      body: row.final_note || row.rough_note,
      photoPaths: (row.photo_evidence || []).map((photo) => photo.path || "").filter(Boolean),
      updatedAt: row.updated_at,
      isOwn: row.staff_id === currentUserId
    })),
    error: ""
  };
}

export async function updateOwnProgressNote(noteId: string, body: string) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return { saved: false, error: "Sign in before editing this progress note." };
  const existing = await supabaseRequest<Array<{ id: string; staff_id: string; status: string }>>("progress_notes", {
    query: `select=id,staff_id,status&id=eq.${encodeURIComponent(noteId)}&limit=1`
  });
  const note = existing.data?.[0];
  if (!note || existing.error) return { saved: false, error: existing.error || "Progress note not found." };
  if (note.staff_id !== currentUserId) return { saved: false, error: "Only the worker who wrote this note can edit it." };
  if (note.status === "Approved" || note.status === "Locked") return { saved: false, error: "Approved records cannot be edited." };
  const result = await supabaseRequest<Array<{ id: string }>>("progress_notes", {
    method: "PATCH",
    query: `id=eq.${encodeURIComponent(noteId)}&staff_id=eq.${encodeURIComponent(currentUserId)}`,
    prefer: "return=representation",
    body: {
      final_note: body.trim(),
      working_draft: body.trim(),
      final_approved_version: null,
      owner_approved: false,
      updated_at: new Date().toISOString()
    }
  });
  return { saved: Boolean(result.data?.length && !result.error), error: result.error };
}

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
      rough_note: input.originalInput,
      final_note: input.note,
      voice_transcript: input.voiceTranscript || null,
      input_method: input.inputMethod || "typed",
      status: input.status || "Submitted",
      original_input: input.originalInput,
      working_draft: input.workingDraft,
      ai_improved_version: input.aiImprovedVersion,
      final_approved_version: input.finalApprovedVersion,
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
  if (/quality_breakdown|original_input|working_draft|ai_improved_version|final_approved_version|input_method/i.test(result.error)) {
    const { quality_breakdown: _qualityBreakdown, original_input: _originalInput, working_draft: _workingDraft, ai_improved_version: _aiVersion, final_approved_version: _finalVersion, ...compatibleBody } = noteBody;
    result = await supabaseRequest<Array<{ id: string }>>("progress_notes", {
      method: "POST",
      query: "on_conflict=id",
      prefer: "resolution=merge-duplicates,return=representation",
      body: { ...compatibleBody, input_method: input.inputMethod === "typed" ? "typed" : "standard_voice" }
    });
  }

  const savedToCloud = Boolean(result.data?.length && !result.error);
  const evidenceResult = savedToCloud && (input.status || "Submitted") === "Submitted"
    ? await savePendingGoalEvidence({
        participantId: input.participantId,
        progressNoteId: input.id,
        goalIds: input.linkedGoalIds || [],
        evidenceDate: `${input.supportDate}T${input.endTime || input.startTime || "00:00"}:00`,
        evidenceText: input.note
      })
    : { saved: true, error: "" };
  if (!evidenceResult.saved) {
    console.error(JSON.stringify({ event: "goal_evidence_link_failed", progressNoteId: input.id, error: evidenceResult.error }));
  }

  return {
    savedToCloud,
    error: result.error,
    bodyAppend: photoEvidence.length ? `\n\nPhoto evidence:\n${photoEvidence.map((photo) => `- ${photo.path}`).join("\n")}` : ""
  };
}
