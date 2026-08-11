import type { SupportDocument } from "@/lib/sample-data";
import { getTenantClients } from "@/lib/client-records";
import { isPresentationModeEnabled } from "@/lib/presentation-mode";
import { getCurrentOrganisationId, getCurrentUserId, getSupabaseProjectConfig, supabaseRequest } from "@/lib/supabase-rest";
import { checkDocumentsPerParticipantLimit } from "@/lib/subscriptions/client-limits";
import { tenantStorageKey } from "@/lib/tenant-storage";

export type StoredDocumentRecord = SupportDocument & {
  clientName: string;
  fileName?: string;
  filePath?: string;
  storageBucket?: string;
  fileSizeBytes?: number;
  savedAt: string;
};

const documentStorageKey = "empowernotes:document-records";
export const documentsUpdatedEvent = "empowernotes:documents-updated";

export function createDocumentId() {
  return globalThis.crypto?.randomUUID?.() || `document-${Date.now()}`;
}

export function getStoredDocumentRecords() {
  if (typeof window === "undefined") return [];
  if (isPresentationModeEnabled()) return [];

  try {
    const stored = window.sessionStorage.getItem(tenantStorageKey(documentStorageKey));
    return stored ? (JSON.parse(stored) as StoredDocumentRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredDocumentRecords(records: StoredDocumentRecord[]) {
  window.sessionStorage.setItem(tenantStorageKey(documentStorageKey), JSON.stringify(records));
  window.dispatchEvent(new Event(documentsUpdatedEvent));
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
  file_size_bytes: number | null;
};

function toStoredDocumentRecord(row: SupabaseDocumentRow, clientName = "Client"): StoredDocumentRecord {
  return {
    id: row.id,
    participantId: row.participant_id,
    clientName,
    type: row.document_type,
    status: row.manager_verified ? "Manager verified" : row.status,
    visibility: row.visibility,
    confidence: row.manager_verified ? 95 : 0,
    startDate: row.start_date || row.created_at.slice(0, 10),
    expiryDate: row.expiry_date || row.created_at.slice(0, 10),
    fileName: row.file_path.split("/").pop(),
    filePath: row.file_path,
    storageBucket: row.storage_bucket || "participant-documents",
    fileSizeBytes: Number(row.file_size_bytes) || 0,
    savedAt: row.created_at
  };
}

export async function getTenantDocumentRecords() {
  if (isPresentationModeEnabled()) return [];
  const result = await supabaseRequest<SupabaseDocumentRow[]>("documents", {
    query: "select=id,participant_id,document_type,file_path,storage_bucket,visibility,status,manager_verified,start_date,expiry_date,file_size_bytes,created_at&order=created_at.desc"
  });

  if (!result.data || result.error) return [];

  const clients = await getTenantClients().catch(() => []);
  const cloudDocuments = result.data.map((row) => {
    const client = clients.find((item) => item.id === row.participant_id);
    return toStoredDocumentRecord(row, client?.name || "Client");
  });
  return cloudDocuments;
}

export async function saveTenantDocumentRecord(record: StoredDocumentRecord) {
  const existingClientDocuments = getStoredDocumentRecords().filter((document) => document.participantId === record.participantId && document.id !== record.id).length;
  const limit = checkDocumentsPerParticipantLimit(existingClientDocuments, record.clientName);
  if (!limit.allowed) return { savedToCloud: false, error: limit.message };

  const organisationId = await getCurrentOrganisationId();
  const userId = getCurrentUserId();
  if (!organisationId || !userId) return { savedToCloud: false, error: "Sign in before saving to your workspace." };

  const safeType = getSafeDocumentType(record.type);
  const safeFileName = getSafeFileName(record.fileName, safeType);
  const filePath = record.filePath || `${record.participantId}/${safeType}/${Date.now()}-${safeFileName}`;
  const storageBucket = record.storageBucket || "participant-documents";

  const result = await supabaseRequest<Array<{ id: string }>>("documents", {
    method: "POST",
    query: "on_conflict=id",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: record.id,
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
      expiry_date: record.expiryDate,
      file_size_bytes: Math.max(0, Math.round(record.fileSizeBytes || 0))
    }
  });

  const savedToCloud = Boolean(result.data && !result.error);
  if (savedToCloud) addStoredDocumentRecord(record);
  return { savedToCloud, error: result.error, documentId: result.data?.[0]?.id || record.id };
}

export async function reviewTenantDocumentRecord(documentId: string, decision: "verify" | "return") {
  const result = await supabaseRequest<Array<{ id: string }>>("documents", {
    method: "PATCH",
    query: `id=eq.${encodeURIComponent(documentId)}&select=id`,
    prefer: "return=representation",
    body: decision === "verify"
      ? { status: "Manager verified", manager_verified: true }
      : { status: "Changes requested", manager_verified: false }
  });

  if (result.data && !result.error) window.dispatchEvent(new Event(documentsUpdatedEvent));
  return { saved: Boolean(result.data?.length && !result.error), error: result.error || "" };
}

export function getSafeDocumentType(type: string) {
  return type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "document";
}

export function getSafeFileName(fileName: string | undefined, safeType: string) {
  return (fileName || `${safeType}.pdf`).replace(/[^\w.\- ]+/g, "").trim() || `${safeType}.pdf`;
}

export function buildDocumentStoragePath(input: { organisationId: string; participantId: string; documentType: string; fileName?: string }) {
  if (!input.organisationId || !input.participantId) throw new Error("An organisation and participant are required for private files.");
  const safeType = getSafeDocumentType(input.documentType);
  const safeFileName = getSafeFileName(input.fileName, safeType);
  return [input.organisationId, input.participantId, safeType, `${Date.now()}-${safeFileName}`].filter(Boolean).join("/");
}

export async function uploadTenantDocumentFile(file: File, filePath: string, bucket = "participant-documents") {
  const { supabaseUrl, supabaseAnonKey, accessToken } = getSupabaseProjectConfig();
  if (!supabaseUrl || !supabaseAnonKey) return { uploaded: false, error: "Cloud workspace is not configured." };
  if (!accessToken) return { uploaded: false, error: "Sign in before uploading files to your workspace." };
  const pathError = await validateTenantStoragePath(filePath);
  if (pathError) return { uploaded: false, error: pathError };

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
  const { accessToken } = getSupabaseProjectConfig();
  if (!accessToken) return { url: "", error: "Sign in before downloading private files." };
  const pathError = await validateTenantStoragePath(filePath);
  if (pathError) return { url: "", error: pathError };

  const response = await fetch("/api/storage/sign", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ filePath, bucket }),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await response.text();
    return { url: "", error: error || response.statusText };
  }

  const data = await response.json() as { url?: string };
  return data.url ? { url: data.url, error: "" } : { url: "", error: "The workspace did not return a secure download link." };
}

export async function getTenantDocumentPreviewUrl(filePath: string, bucket = "participant-documents") {
  const { supabaseUrl, supabaseAnonKey, accessToken } = getSupabaseProjectConfig();
  if (!supabaseUrl || !supabaseAnonKey) return { url: "", error: "Cloud workspace is not configured." };
  if (!accessToken) return { url: "", error: "Sign in before viewing private files." };
  const pathError = await validateTenantStoragePath(filePath);
  if (pathError) return { url: "", error: pathError };

  const response = await fetch(`${supabaseUrl}/storage/v1/object/authenticated/${bucket}/${encodeURI(filePath)}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    return { url: "", error: error || response.statusText };
  }

  return { url: URL.createObjectURL(await response.blob()), error: "" };
}

export async function deleteTenantDocumentFile(filePath: string, bucket = "participant-documents") {
  const { supabaseUrl, supabaseAnonKey, accessToken } = getSupabaseProjectConfig();
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return { deleted: false, error: "Sign in before deleting private files." };
  const pathError = await validateTenantStoragePath(filePath);
  if (pathError) return { deleted: false, error: pathError };
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(filePath)}`, { method: "DELETE", headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` } });
  return response.ok ? { deleted: true, error: "" } : { deleted: false, error: await response.text() || response.statusText };
}

async function validateTenantStoragePath(filePath: string) {
  const organisationId = await getCurrentOrganisationId();
  const pathOrganisationId = filePath.split("/")[0] || "";
  if (!organisationId) return "Your active organisation could not be verified.";
  if (pathOrganisationId !== organisationId) return "This file does not belong to the active organisation.";
  return "";
}
