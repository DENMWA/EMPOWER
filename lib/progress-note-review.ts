import { getTenantClients } from "@/lib/client-records";
import { supabaseRequest, supabaseRpc } from "@/lib/supabase-rest";
import type { NoteQuality } from "@/lib/ai-mock";

export type ProgressNoteReviewItem = {
  id: string;
  participantId: string;
  staffId: string;
  clientName: string;
  staffName: string;
  supportDate: string;
  supportType: string;
  status: string;
  body: string;
  missingDetails: string[];
  riskyWordingFlags: string[];
  qualityScore: number;
  billingEvidenceScore: number;
  qualityBreakdown: NoteQuality | null;
  updatedAt: string;
  latestReview: {
    action: string;
    comments: string;
    reviewerName: string;
    createdAt: string;
  } | null;
};

type ApprovalRow = {
  progress_note_id: string;
  reviewer_id: string;
  action: string;
  comments: string | null;
  created_at: string;
};

type ProgressNoteRow = {
  id: string;
  participant_id: string;
  staff_id: string;
  support_date: string;
  support_type: string;
  status: string;
  final_note: string | null;
  rough_note: string;
  missing_details: string[] | null;
  risky_wording_flags: string[] | null;
  ai_quality_score: number;
  billing_evidence_score: number;
  quality_breakdown: NoteQuality | null;
  updated_at: string;
};

export async function getTenantProgressNotesForReview() {
  let [notesResult, clients, usersResult, approvalsResult] = await Promise.all([
    supabaseRequest<ProgressNoteRow[]>("progress_notes", {
      query: "select=id,participant_id,staff_id,support_date,support_type,status,final_note,rough_note,missing_details,risky_wording_flags,ai_quality_score,billing_evidence_score,quality_breakdown,updated_at&order=updated_at.desc"
    }),
    getTenantClients(true).catch(() => []),
    supabaseRequest<Array<{ id: string; name: string | null; email: string }>>("users", {
      query: "select=id,name,email"
    }),
    supabaseRequest<ApprovalRow[]>("approvals", {
      query: "select=progress_note_id,reviewer_id,action,comments,created_at&order=created_at.desc"
    })
  ]);

  if (notesResult.error.includes("quality_breakdown")) {
    notesResult = await supabaseRequest<ProgressNoteRow[]>("progress_notes", {
      query: "select=id,participant_id,staff_id,support_date,support_type,status,final_note,rough_note,missing_details,risky_wording_flags,ai_quality_score,billing_evidence_score,updated_at&order=updated_at.desc"
    });
  }

  if (!notesResult.data || notesResult.error) return { records: [] as ProgressNoteReviewItem[], error: notesResult.error };
  const clientNames = new Map(clients.map((client) => [client.id, client.name]));
  const staffNames = new Map((usersResult.data || []).map((user) => [user.id, user.name || user.email]));
  const latestReviews = new Map<string, ApprovalRow>();
  for (const review of approvalsResult.data || []) {
    if (!latestReviews.has(review.progress_note_id)) latestReviews.set(review.progress_note_id, review);
  }
  return {
    records: notesResult.data.map((note) => {
      const latestReview = latestReviews.get(note.id);
      return {
      id: note.id,
      participantId: note.participant_id,
      staffId: note.staff_id,
      clientName: clientNames.get(note.participant_id) || "Client",
      staffName: staffNames.get(note.staff_id) || "Staff member",
      supportDate: note.support_date,
      supportType: note.support_type,
      status: note.status,
      body: note.final_note || note.rough_note,
      missingDetails: note.missing_details || [],
      riskyWordingFlags: note.risky_wording_flags || [],
      qualityScore: note.ai_quality_score || 0,
      billingEvidenceScore: note.billing_evidence_score || 0,
      qualityBreakdown: note.quality_breakdown || null,
      updatedAt: note.updated_at,
      latestReview: latestReview ? {
        action: latestReview.action,
        comments: latestReview.comments || "",
        reviewerName: staffNames.get(latestReview.reviewer_id) || "Reviewer",
        createdAt: latestReview.created_at
      } : null
    };
    }),
    error: ""
  };
}

export async function reviewTenantProgressNote(noteId: string, action: "approve" | "request_details" | "certify", comments: string) {
  const result = await supabaseRpc<string>("review_progress_note", {
    selected_note_id: noteId,
    selected_action: action,
    reviewer_comments: comments.trim() || null
  });
  return { savedToCloud: Boolean(result.data && !result.error), status: result.data || "", error: result.error };
}
