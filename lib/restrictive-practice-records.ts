import { getCurrentOrganisationId, supabaseRequest } from "@/lib/supabase-rest";

export const restrictivePracticeTypes = ["Seclusion", "Chemical restraint", "Mechanical restraint", "Physical restraint", "Environmental restraint"] as const;
export type RestrictivePracticeType = typeof restrictivePracticeTypes[number];

export type RestrictivePracticeAuthorisation = {
  id: string; participantId: string; houseId: string; practiceType: RestrictivePracticeType; practiceName: string;
  behaviourSupportPlan: string; authorisingBody: string; authorisationReference: string; startsOn: string; expiresOn: string;
  conditions: string; maximumDurationMinutes: number | null; maximumFrequency: string; approvalStatus: "Approved" | "Unapproved";
  status: "Active" | "Phasing out" | "Ceased" | "Suspended" | "Expired"; phaseOutTargetDate: string; ceasedOn: string; cessationReason: string;
};

export type RestrictivePracticeUse = {
  id: string; authorisationId: string; participantId: string; houseId: string; practiceType: RestrictivePracticeType; usedAt: string; endedAt: string;
  triggerContext: string; alternativesAttempted: string; implementation: string; participantResponse: string; monitoring: string;
  recoverySupport: string; injuryOrHarm: boolean; injurySummary: string; approvalStatus: "Approved" | "Unapproved"; matchedAuthorisation: boolean; varianceDetails: string;
  staffNames: string; notifications: string; status: "Draft" | "Submitted" | "Reviewed"; linkedIncidentId?: string;
};

type DbAuthorisation = Record<string, unknown>;
type DbUse = Record<string, unknown>;
const text = (value: unknown) => typeof value === "string" ? value : "";

export async function getRestrictivePracticeAuthorisations() {
  const result = await supabaseRequest<DbAuthorisation[]>("restrictive_practice_authorisations", { query: "select=*&order=expires_on.asc" });
  if (!result.data || result.error) return [];
  return result.data.map((row): RestrictivePracticeAuthorisation => ({
    id: text(row.id), participantId: text(row.participant_id), houseId: text(row.house_id), practiceType: text(row.practice_type) as RestrictivePracticeType,
    practiceName: text(row.practice_name), behaviourSupportPlan: text(row.behaviour_support_plan), authorisingBody: text(row.authorising_body),
    authorisationReference: text(row.authorisation_reference), startsOn: text(row.starts_on), expiresOn: text(row.expires_on), conditions: text(row.conditions),
    maximumDurationMinutes: typeof row.maximum_duration_minutes === "number" ? row.maximum_duration_minutes : null,
    maximumFrequency: text(row.maximum_frequency), approvalStatus: text(row.approval_status) === "Unapproved" ? "Unapproved" : "Approved", status: text(row.status) as RestrictivePracticeAuthorisation["status"],
    phaseOutTargetDate: text(row.phase_out_target_date), ceasedOn: text(row.ceased_on), cessationReason: text(row.cessation_reason)
  }));
}

export async function saveRestrictivePracticeAuthorisation(record: RestrictivePracticeAuthorisation) {
  const organisationId = await getCurrentOrganisationId();
  if (!organisationId) return { saved: false, error: "Sign in before saving this authorisation." };
  const result = await supabaseRequest<DbAuthorisation[]>("restrictive_practice_authorisations", { method: "POST", query: "on_conflict=id", prefer: "resolution=merge-duplicates,return=representation", body: {
    id: record.id, organisation_id: organisationId, participant_id: record.participantId, house_id: record.houseId || null, practice_type: record.practiceType,
    practice_name: record.practiceName, behaviour_support_plan: record.behaviourSupportPlan, authorising_body: record.authorisingBody,
    authorisation_reference: record.authorisationReference, starts_on: record.startsOn, expires_on: record.expiresOn, conditions: record.conditions,
    maximum_duration_minutes: record.maximumDurationMinutes, maximum_frequency: record.maximumFrequency, approval_status: record.approvalStatus, status: record.status,
    phase_out_target_date: record.phaseOutTargetDate || null, ceased_on: record.ceasedOn || null, cessation_reason: record.cessationReason || "", updated_at: new Date().toISOString()
  }});
  return { saved: Boolean(result.data && !result.error), error: result.error };
}

export async function getRestrictivePracticeUses() {
  const result = await supabaseRequest<DbUse[]>("restrictive_practice_uses", { query: "select=*&order=used_at.desc" });
  if (!result.data || result.error) return [];
  return result.data.map((row): RestrictivePracticeUse => ({
    id: text(row.id), authorisationId: text(row.authorisation_id), participantId: text(row.participant_id), houseId: text(row.house_id), practiceType: (text(row.practice_type) || "Environmental restraint") as RestrictivePracticeType, usedAt: text(row.used_at), endedAt: text(row.ended_at),
    triggerContext: text(row.trigger_context), alternativesAttempted: text(row.alternatives_attempted), implementation: text(row.implementation), participantResponse: text(row.participant_response),
    monitoring: text(row.monitoring), recoverySupport: text(row.recovery_support), injuryOrHarm: Boolean(row.injury_or_harm), injurySummary: text(row.injury_summary),
    approvalStatus: text(row.approval_status) === "Unapproved" ? "Unapproved" : "Approved", matchedAuthorisation: row.matched_authorisation !== false, varianceDetails: text(row.variance_details), staffNames: text(row.staff_names), notifications: text(row.notifications),
    status: text(row.status) as RestrictivePracticeUse["status"], linkedIncidentId: text(row.linked_incident_id) || undefined
  }));
}

export async function saveRestrictivePracticeUse(record: RestrictivePracticeUse) {
  const organisationId = await getCurrentOrganisationId();
  if (!organisationId) return { saved: false, error: "Sign in before saving this use record." };
  const result = await supabaseRequest<DbUse[]>("restrictive_practice_uses", { method: "POST", query: "on_conflict=id", prefer: "resolution=merge-duplicates,return=representation", body: {
    id: record.id, organisation_id: organisationId, authorisation_id: record.authorisationId || null, participant_id: record.participantId, house_id: record.houseId || null, practice_type: record.practiceType,
    used_at: record.usedAt, ended_at: record.endedAt || null, trigger_context: record.triggerContext, alternatives_attempted: record.alternativesAttempted,
    implementation: record.implementation, participant_response: record.participantResponse, monitoring: record.monitoring, recovery_support: record.recoverySupport,
    injury_or_harm: record.injuryOrHarm, injury_summary: record.injurySummary, approval_status: record.approvalStatus, matched_authorisation: record.matchedAuthorisation,
    variance_details: record.varianceDetails, staff_names: record.staffNames, notifications: record.notifications, status: record.status,
    linked_incident_id: record.linkedIncidentId || null, updated_at: new Date().toISOString()
  }});
  return { saved: Boolean(result.data && !result.error), error: result.error };
}
