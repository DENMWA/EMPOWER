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

export function getLocalRetainedRecords(type?: string) {
  if (typeof window === "undefined") return [];

  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith("empower-retained-record:"))
    .map((key) => {
      try {
        return JSON.parse(window.localStorage.getItem(key) || "") as RetainedRecord;
      } catch {
        return null;
      }
    })
    .filter((record): record is RetainedRecord => Boolean(record && (!type || record.type === type)));
}

type SupabaseRetainedRecordRow = {
  id: string;
  record_type: string;
  title: string;
  body: string;
  saved_at: string;
};

function toRetainedRecord(row: SupabaseRetainedRecordRow): RetainedRecord {
  return {
    id: row.id,
    type: row.record_type,
    title: row.title,
    body: row.body,
    savedAt: row.saved_at
  };
}

export async function getTenantRetainedRecords(type?: string) {
  const localRecords = getLocalRetainedRecords(type);
  const typeFilter = type ? `&record_type=eq.${encodeURIComponent(type)}` : "";

  const result = await supabaseRequest<SupabaseRetainedRecordRow[]>("retained_records", {
    query: `select=id,record_type,title,body,saved_at${typeFilter}&order=saved_at.desc`
  });

  if (!result.data || result.error) return localRecords;

  const cloudRecords = result.data.map(toRetainedRecord);
  const localOnlyRecords = localRecords.filter((localRecord) => !cloudRecords.some((cloudRecord) => cloudRecord.id === localRecord.id));
  return [...cloudRecords, ...localOnlyRecords];
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
