import type { SupportDocument } from "@/lib/sample-data";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { getCurrentOrganisationId, getCurrentUserId, supabaseRequest } from "@/lib/supabase-rest";

export type StoredDocumentRecord = SupportDocument & {
  clientName: string;
  fileName?: string;
  savedAt: string;
};

const documentStorageKey = "empowernotes:document-records";

export function createDocumentId() {
  return `document-${Date.now()}`;
}

export function getStoredDocumentRecords() {
  if (typeof window === "undefined") return [];
  if (isPresentationModeEnabled()) return [];

  try {
    const stored = window.localStorage.getItem(documentStorageKey);
    return stored ? (JSON.parse(stored) as StoredDocumentRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredDocumentRecords(records: StoredDocumentRecord[]) {
  window.localStorage.setItem(documentStorageKey, JSON.stringify(records));
}

export function addStoredDocumentRecord(record: StoredDocumentRecord) {
  saveStoredDocumentRecords([record, ...getStoredDocumentRecords()]);
}

type SupabaseDocumentRow = {
  id: string;
  participant_id: string;
  document_type: string;
  file_path: string;
  visibility: "worker-visible" | "manager-only";
  status: string;
  manager_verified: boolean;
  start_date: string | null;
  expiry_date: string | null;
  created_at: string;
};

function toStoredDocumentRecord(row: SupabaseDocumentRow): StoredDocumentRecord {
  return {
    id: row.id,
    participantId: row.participant_id,
    clientName: "Client",
    type: row.document_type,
    status: row.manager_verified ? "Manager verified" : row.status,
    visibility: row.visibility,
    confidence: row.manager_verified ? 95 : 0,
    startDate: row.start_date || row.created_at.slice(0, 10),
    expiryDate: row.expiry_date || row.created_at.slice(0, 10),
    fileName: row.file_path.split("/").pop(),
    savedAt: row.created_at
  };
}

export async function getTenantDocumentRecords() {
  if (isPresentationModeEnabled()) return [];
  const localDocuments = getStoredDocumentRecords();

  const result = await supabaseRequest<SupabaseDocumentRow[]>("documents", {
    query: "select=id,participant_id,document_type,file_path,visibility,status,manager_verified,start_date,expiry_date,created_at&order=created_at.desc"
  });

  if (!result.data || result.error) return localDocuments;

  const cloudDocuments = result.data.map(toStoredDocumentRecord);
  const localOnlyDocuments = localDocuments.filter((localRecord) => !cloudDocuments.some((cloudRecord) => cloudRecord.id === localRecord.id));
  return [...cloudDocuments, ...localOnlyDocuments];
}

export async function saveTenantDocumentRecord(record: StoredDocumentRecord) {
  addStoredDocumentRecord(record);

  const organisationId = await getCurrentOrganisationId();
  const userId = getCurrentUserId();
  if (!organisationId || !userId) return { savedToCloud: false, error: "Sign in before saving to Supabase." };

  const safeType = record.type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "document";
  const safeFileName = (record.fileName || `${safeType}.pdf`).replace(/[^\w.\- ]+/g, "").trim() || `${safeType}.pdf`;

  const result = await supabaseRequest<Array<{ id: string }>>("documents", {
    method: "POST",
    body: {
      organisation_id: organisationId,
      participant_id: record.participantId,
      uploaded_by: userId,
      document_type: record.type,
      file_path: `${record.participantId}/${safeType}/${Date.now()}-${safeFileName}`,
      visibility: record.visibility,
      status: record.status,
      manager_verified: record.status.toLowerCase().includes("verified"),
      start_date: record.startDate,
      expiry_date: record.expiryDate
    }
  });

  return { savedToCloud: Boolean(result.data && !result.error), error: result.error };
}
