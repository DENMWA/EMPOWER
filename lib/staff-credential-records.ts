import { getCurrentOrganisationId, getCurrentUserId, supabaseRequest } from "@/lib/supabase-rest";

export const credentialTypes = ["NDIS Worker Screening", "Working with Children Check", "Police check", "First aid", "CPR", "Driver licence", "Medication competency", "Manual handling"];

export type StaffCredential = {
  id: string;
  staffInviteId: string;
  credentialType: string;
  referenceNumber: string;
  issuedDate: string;
  expiryDate: string;
  warningDays: number;
  status: "current" | "expired" | "under_review" | "waived";
};

type StaffCredentialRow = { id: string; staff_invite_id: string; credential_type: string; reference_number: string | null; issued_date: string | null; expiry_date: string; warning_days: number; status: StaffCredential["status"] };

function fromRow(row: StaffCredentialRow): StaffCredential {
  return { id: row.id, staffInviteId: row.staff_invite_id, credentialType: row.credential_type, referenceNumber: row.reference_number || "", issuedDate: row.issued_date || "", expiryDate: row.expiry_date, warningDays: row.warning_days, status: row.status };
}

export async function getStaffCredentials() {
  const result = await supabaseRequest<StaffCredentialRow[]>("staff_credentials", { query: "select=id,staff_invite_id,credential_type,reference_number,issued_date,expiry_date,warning_days,status&order=expiry_date.asc" });
  return result.data?.map(fromRow) || [];
}

export async function saveStaffCredential(input: Omit<StaffCredential, "id" | "status"> & { id?: string }) {
  const organisationId = await getCurrentOrganisationId();
  const userId = getCurrentUserId();
  if (!organisationId || !userId) return { saved: false, error: "Sign in before saving credentials." };
  const result = await supabaseRequest<StaffCredentialRow[]>("staff_credentials", {
    method: "POST", query: "on_conflict=staff_invite_id,credential_type", prefer: "resolution=merge-duplicates,return=representation",
    body: { id: input.id || undefined, organisation_id: organisationId, staff_invite_id: input.staffInviteId, credential_type: input.credentialType, reference_number: input.referenceNumber || null, issued_date: input.issuedDate || null, expiry_date: input.expiryDate, warning_days: input.warningDays, status: "current", created_by: userId, updated_at: new Date().toISOString() }
  });
  return { saved: Boolean(result.data?.length && !result.error), error: result.error };
}

export function getCredentialUrgency(expiryDate: string, warningDays: number) {
  const days = Math.ceil((new Date(`${expiryDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days < 0) return { label: "Expired", tone: "red" as const, days };
  if (days <= 14) return { label: `${days} days`, tone: "red" as const, days };
  if (days <= warningDays) return { label: `${days} days`, tone: "amber" as const, days };
  return { label: "Current", tone: "green" as const, days };
}

