"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { RecordActions } from "@/components/records/RecordActions";
import { PrivateClientPhoto } from "@/components/participants/PrivateClientPhoto";
import { getClientColourScheme } from "@/lib/client-colours";
import { clientsUpdatedEvent, getTenantClients, type ClientRecord } from "@/lib/client-records";
import { documentsUpdatedEvent, getTenantDocumentDownloadUrl, getTenantDocumentRecords, reviewTenantDocumentRecord, type StoredDocumentRecord } from "@/lib/document-records";
import { isRealModeEnabled } from "@/lib/presentation-mode";
import { documents, participants } from "@/lib/sample-data";
import { filterByParticipantAccess, filterRecordsByParticipantAccess } from "@/lib/user-access";
import { cn } from "@/lib/utils";
import { isWorkerCareDocumentType } from "@/lib/document-access";
import { getStoredAccessToken } from "@/lib/supabase-rest";

const dayMs = 24 * 60 * 60 * 1000;

export function DocumentVault({ reviewMode = false }: { reviewMode?: boolean }) {
  const [storedClients, setStoredClients] = useState<ClientRecord[]>([]);
  const [storedDocuments, setStoredDocuments] = useState<StoredDocumentRecord[]>([]);
  const [realMode, setRealMode] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [canManageProtectedDocuments, setCanManageProtectedDocuments] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const allParticipants = useMemo(() => storedClients.length ? storedClients : realMode ? [] : filterByParticipantAccess(participants), [storedClients, realMode]);
  const allDocuments = useMemo(() => (storedDocuments.length ? storedDocuments : realMode ? [] : filterRecordsByParticipantAccess(documents.map((document) => {
    const participant = participants.find((item) => item.id === document.participantId);
    return {
      ...document,
      clientName: participant?.name ?? "Unassigned client",
      savedAt: new Date(`${document.startDate}T00:00:00`).toISOString()
    };
  }))).filter((document) => canManageProtectedDocuments || (document.visibility === "worker-visible" && isWorkerCareDocumentType(document.type))), [canManageProtectedDocuments, storedDocuments, realMode]);
  const expirySummary = useMemo(() => {
    return allDocuments.reduce(
      (summary, document) => {
        const reminder = getExpiryReminder(document.expiryDate);
        if (reminder.tone === "red") summary.urgent += 1;
        if (reminder.tone === "amber") summary.month += 1;
        return summary;
      },
      { urgent: 0, month: 0 }
    );
  }, [allDocuments]);

  useEffect(() => {
    function loadRecords() {
      getTenantClients().then(setStoredClients).catch(() => setStoredClients([]));
      getTenantDocumentRecords().then(setStoredDocuments).catch(() => setStoredDocuments([]));
    }

    loadRecords();
    window.addEventListener(clientsUpdatedEvent, loadRecords);
    window.addEventListener(documentsUpdatedEvent, loadRecords);
    return () => {
      window.removeEventListener(clientsUpdatedEvent, loadRecords);
      window.removeEventListener(documentsUpdatedEvent, loadRecords);
    };
  }, []);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    fetch(`/api/auth/access?mode=admin&permission=${reviewMode ? "documents" : "people"}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    })
      .then((response) => response.json())
      .then((result: { allowed?: boolean }) => setCanManageProtectedDocuments(Boolean(result.allowed)))
      .catch(() => setCanManageProtectedDocuments(false));
  }, [reviewMode]);

  useEffect(() => {
    function syncDataMode() {
      setRealMode(isRealModeEnabled());
    }

    syncDataMode();
    window.addEventListener("empowernotes:data-mode-updated", syncDataMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncDataMode);
  }, []);

  return (
    <Card>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-sea">Client organised files</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">Document Vault</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Direct-care documents are shown with their assigned client so current support guidance remains easy to find.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-500">Total documents</p>
          <p className="mt-1 text-2xl font-bold text-ink">{allDocuments.length}</p>
        </div>
        <div className="rounded-md border border-amber-100 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-800">One-month reminders</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{expirySummary.month}</p>
        </div>
        <div className="rounded-md border border-red-100 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-700">Fortnight / expired</p>
          <p className="mt-1 text-2xl font-bold text-red-800">{expirySummary.urgent}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {!allDocuments.length ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="font-semibold text-ink">No client documents saved yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Add a client, then upload their documents so this vault shows only that organisation&apos;s records.</p>
          </div>
        ) : null}
        {allDocuments.map((doc) => {
          const participant = allParticipants.find((item) => item.id === doc.participantId);
          const colourSchemeId = participant && "colourSchemeId" in participant && typeof participant.colourSchemeId === "string" ? participant.colourSchemeId : undefined;
          const colour = getClientColourScheme(doc.participantId, colourSchemeId);
          const reminder = getExpiryReminder(doc.expiryDate);
          const fileName = getDocumentFileName(doc);
          const hasPrivateFile = Boolean(getDocumentFilePath(doc) && !doc.status.toLowerCase().includes("pending upload"));
          return (
            <div key={doc.id} className={cn("flex flex-wrap items-center justify-between gap-3 rounded-md border border-l-4 p-4", colour.border)}>
              <div className="flex items-start gap-3">
                <PrivateClientPhoto path={participant && "profilePhotoPath" in participant && typeof participant.profilePhotoPath === "string" ? participant.profilePhotoPath : undefined} alt={`${participant?.name ?? "Client"} profile`} fallback={participant?.initials ?? "CL"} className={colour.avatar} />
                <div>
                  <p className="font-semibold text-ink">{doc.type}</p>
                  <p className="text-sm text-slate-600">{participant?.name ?? doc.clientName ?? "Unassigned client"} - {doc.confidence ? `${doc.confidence}% extraction confidence` : "Awaiting AI extraction"}</p>
                  {fileName ? <p className="mt-1 text-sm text-slate-600">File: {fileName}</p> : null}
                  <p className="mt-1 text-sm text-slate-600">Start: {formatDate(doc.startDate)} | Expiry: {formatDate(doc.expiryDate)}</p>
                  <span className={cn("mt-2 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", colour.badge)}>{colour.label} client file</span>
                  <RecordActions
                    className="mt-3"
                    recordId={doc.id}
                    recordType="document"
                    title={`${doc.type} - ${participant?.name ?? doc.clientName ?? "Unassigned client"}`}
                    body={[
                      `Client: ${participant?.name ?? doc.clientName ?? "Unassigned client"}`,
                      `Document type: ${doc.type}`,
                      `Status: ${doc.status}`,
                      `Visibility: ${doc.visibility}`,
                      fileName ? `File name: ${fileName}` : "",
                      `Start date: ${formatDate(doc.startDate)}`,
                      `Expiry date: ${formatDate(doc.expiryDate)}`,
                      `Reminder: ${reminder.label}`,
                      `Extraction confidence: ${doc.confidence}%`
                    ].filter(Boolean).join("\n")}
                    filename={`empowernotes-${doc.id}-${doc.type.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                  {hasPrivateFile ? (
                    <button type="button" onClick={() => openPrivateDocument(doc)} className="mt-3 inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:border-teal-400">
                      Open private file
                    </button>
                  ) : null}
                  {reviewMode && canManageProtectedDocuments ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" disabled={reviewingId === doc.id} onClick={() => reviewDocument(doc.id, "verify")} className="inline-flex min-h-10 items-center rounded-md bg-sea px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
                        Verify document
                      </button>
                      <button type="button" disabled={reviewingId === doc.id} onClick={() => reviewDocument(doc.id, "return")} className="inline-flex min-h-10 items-center rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:text-slate-400">
                        Request changes
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={reminder.label} tone={reminder.tone} />
                <StatusBadge label={doc.status} tone={doc.status.includes("verified") ? "green" : "amber"} />
                <StatusBadge label={doc.visibility} tone={doc.visibility === "manager-only" ? "red" : "blue"} />
              </div>
            </div>
          );
        })}
      </div>
      {downloadMessage ? <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{downloadMessage}</p> : null}
    </Card>
  );

  async function openPrivateDocument(document: object) {
    const filePath = getDocumentFilePath(document);
    if (!filePath) return;
    const result = await getTenantDocumentDownloadUrl(filePath, getDocumentStorageBucket(document));
    if (result.error || !result.url) {
      setDownloadMessage(result.error || "Private file could not be opened.");
      return;
    }
    setDownloadMessage("");
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function reviewDocument(documentId: string, decision: "verify" | "return") {
    setReviewingId(documentId);
    const result = await reviewTenantDocumentRecord(documentId, decision);
    setDownloadMessage(result.saved ? (decision === "verify" ? "Document verified." : "Document returned for changes.") : result.error || "The review decision could not be saved.");
    setReviewingId("");
  }
}

function getExpiryReminder(expiryDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / dayMs);

  if (daysUntilExpiry < 0) {
    return { label: `Expired ${Math.abs(daysUntilExpiry)} days ago`, tone: "red" as const };
  }

  if (daysUntilExpiry <= 14) {
    return { label: `Fortnight reminder: ${daysUntilExpiry} days left`, tone: "red" as const };
  }

  if (daysUntilExpiry <= 30) {
    return { label: `One month reminder: ${daysUntilExpiry} days left`, tone: "amber" as const };
  }

  return { label: `Active: ${daysUntilExpiry} days left`, tone: "green" as const };
}

function getDocumentFileName(document: object) {
  const fileName = "fileName" in document ? document.fileName : undefined;
  return typeof fileName === "string" && fileName.trim() ? fileName : undefined;
}

function getDocumentFilePath(document: object) {
  const filePath = "filePath" in document ? document.filePath : undefined;
  return typeof filePath === "string" && filePath.trim() ? filePath : undefined;
}

function getDocumentStorageBucket(document: object) {
  const storageBucket = "storageBucket" in document ? document.storageBucket : undefined;
  return typeof storageBucket === "string" && storageBucket.trim() ? storageBucket : "participant-documents";
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
