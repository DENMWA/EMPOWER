import { getCurrentOrganisationId, getCurrentUserId, supabaseRequest } from "@/lib/supabase-rest";

export type RetainedRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  savedAt: string;
};

export function saveLocalRetainedRecord(record: RetainedRecord) {
  window.localStorage.setItem(`empower-retained-record:${record.id}`, JSON.stringify(record));
}

export async function saveTenantRetainedRecord(record: RetainedRecord) {
  saveLocalRetainedRecord(record);

  const organisationId = await getCurrentOrganisationId();
  if (!organisationId) return { savedToCloud: false, error: "Sign in before saving to Supabase." };

  const result = await supabaseRequest<Array<{ id: string }>>("retained_records", {
    method: "POST",
    query: "on_conflict=organisation_id,id",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: record.id,
      organisation_id: organisationId,
      record_type: record.type,
      title: record.title,
      body: record.body,
      saved_by: getCurrentUserId() || null,
      saved_at: record.savedAt
    }
  });

  return { savedToCloud: Boolean(result.data && !result.error), error: result.error };
}
