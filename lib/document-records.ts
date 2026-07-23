import type { SupportDocument } from "@/lib/sample-data";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { getCurrentOrganisationId, getCurrentUserId, getSupabaseProjectConfig, supabaseRequest } from "@/lib/supabase-rest";
import { checkDocumentsPerParticipantLimit } from "@/lib/subscriptions/client-limits";

export type StoredDocumentRecord = SupportDocument & {
  clientName: string;
  fileName?: string;
  filePath?: string;
  storageBucket?: string;
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
  storage_bucket: string;
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
    filePath: row.file_path,
    storageBucket: row.storage_bucket || "participant-documents",
    savedAt: row.created_at
  };
}

export async function getTenantDocumentRecords() {
  if (isPresentationModeEnabled()) return [];
  const localDocuments = getStoredDocumentRecords();

  const result = await supabaseRequest<SupabaseDocumentRow[]>("documents", {
    query: "select=id,participant_id,document_type,file_path,storage_bucket,visibility,status,manager_verified,start_date,expiry_date,created_at&order=created_at.desc"
  });

  if (!result.data || result.error) return localDocuments;

  const cloudDocuments = result.data.map(toStoredDocumentRecord);
  const localOnlyDocuments = localDocuments.filter((localRecord) => !cloudDocuments.some((cloudRecord) => cloudRecord.id === localRecord.id));
  return [...cloudDocuments, ...localOnlyDocuments];
}

export async function saveTenantDocumentRecord(record: StoredDocumentRecord) {
  const existingClientDocuments = getStoredDocumentRecords().filter((document) => document.participantId === record.participantId).length;
  const limit = checkDocumentsPerParticipantLimit(existingClientDocuments, record.clientName);
  if (!limit.allowed) return { savedToCloud: false, error: limit.message };

  addStoredDocumentRecord(record);

  const organisationId = await getCurrentOrganisationId();
  const userId = getCurrentUserId();
  if (!organisationId || !userId) return { savedToCloud: false, error: "Sign in before saving to Supabase." };

  const safeType = getSafeDocumentType(record.type);
  const safeFileName = getSafeFileName(record.fileName, safeType);
  const filePath = record.filePath || `${record.participantId}/${safeType}/${Date.now()}-${safeFileName}`;
  const storageBucket = record.storageBucket || "participant-documents";

  const result = await supabaseRequest<Array<{ id: string }>>("documents", {
    method: "POST",
    body: {
      organisation_id: organisationId,
      participant_id: record.participantId,
      uploaded_by: userId,
      document_type: record.type,
      file_path: filePath,
      storage_bucket: storageBucket,
      visibility: record.visibility,
      status: record.status,
      manager_verified: record.status.toLowerCase().includes("verified"),
      start_date: record.startDate,
      expiry_date: record.expiryDate
    }
  });

  return { savedToCloud: Boolean(result.data && !result.error), error: result.error };
}

export function getSafeDocumentType(type: string) {
  return type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "document";
}

export function getSafeFileName(fileName: string | undefined, safeType: string) {
  return (fileName || `${safeType}.pdf`).replace(/[^\w.\- ]+/g, "").trim() || `${safeType}.pdf`;
}

export function buildDocumentStoragePath(input: { organisationId?: string; participantId: string; documentType: string; fileName?: string }) {
  const safeType = getSafeDocumentType(input.documentType);
  const safeFileName = getSafeFileName(input.fileName, safeType);
  return [input.organisationId, input.participantId, safeType, `${Date.now()}-${safeFileName}`].filter(Boolean).join("/");
}

export async function uploadTenantDocumentFile(file: File, filePath: string, bucket = "participant-documents") {
  const { supabaseUrl, supabaseAnonKey, accessToken } = getSupabaseProjectConfig();
  if (!supabaseUrl || !supabaseAnonKey) return { uploaded: false, error: "Supabase is not configured." };
  if (!accessToken) return { uploaded: false, error: "Sign in before uploading files to Supabase Storage." };

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(filePath)}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true"
    },
    body: file
  });

  if (!response.ok) {
    const error = await response.text();
    return { uploaded: false, error: error || response.statusText };
  }

  return { uploaded: true, error: "" };
}

export async function getTenantDocumentDownloadUrl(filePath: string, bucket = "participant-documents") {
  const { supabaseUrl, supabaseAnonKey, accessToken } = getSupabaseProjectConfig();
  if (!supabaseUrl || !supabaseAnonKey) return { url: "", error: "Supabase is not configured." };
  if (!accessToken) return { url: "", error: "Sign in before downloading private files." };

  const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}/${encodeURI(filePath)}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn: 300 })
  });

  if (!response.ok) {
    const error = await response.text();
    return { url: "", error: error || response.statusText };
  }

  const data = await response.json() as { signedURL?: string; signedUrl?: string };
  const signedPath = data.signedURL || data.signedUrl || "";
  if (!signedPath) return { url: "", error: "Supabase did not return a signed download link." };

  return {
    url: signedPath.startsWith("http") ? signedPath : `${supabaseUrl}${signedPath}`,
    error: ""
  };
}
