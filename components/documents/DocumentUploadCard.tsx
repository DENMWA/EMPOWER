"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUp, UserRoundCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import { clientsUpdatedEvent, getTenantClients, type ClientRecord } from "@/lib/client-records";
import { buildDocumentStoragePath, createDocumentId, documentsUpdatedEvent, saveTenantDocumentRecord, uploadTenantDocumentFile } from "@/lib/document-records";
import { isRealModeEnabled } from "@/lib/presentation-mode";
import { participants } from "@/lib/sample-data";
import { markTrialStepComplete } from "@/lib/trial-run";
import { getCurrentOrganisationId, getStoredAccessToken } from "@/lib/supabase-rest";
import { filterByParticipantAccess } from "@/lib/user-access";
import { cn } from "@/lib/utils";
import { protectedDocumentTypes, workerCareDocumentTypes } from "@/lib/document-access";

export function DocumentUploadCard() {
  const [storedClients, setStoredClients] = useState<ClientRecord[]>([]);
  const [realMode, setRealMode] = useState(false);
  const [clientId, setClientId] = useState("");
  const [documentType, setDocumentType] = useState<string>(workerCareDocumentTypes[0]);
  const [visibility, setVisibility] = useState<"worker-visible" | "manager-only">("worker-visible");
  const [canManageProtectedDocuments, setCanManageProtectedDocuments] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [pendingDocumentId, setPendingDocumentId] = useState("");
  const [pendingFilePath, setPendingFilePath] = useState("");
  const allParticipants = useMemo(
    () => storedClients.length ? storedClients : realMode ? [] : filterByParticipantAccess(participants),
    [storedClients, realMode]
  );
  const selectedClient = allParticipants.find((participant) => participant.id === clientId) ?? allParticipants[0];

  useEffect(() => {
    function loadClients() {
      getTenantClients().then(setStoredClients).catch(() => setStoredClients([]));
    }

    loadClients();
    window.addEventListener(clientsUpdatedEvent, loadClients);
    return () => window.removeEventListener(clientsUpdatedEvent, loadClients);
  }, []);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    fetch("/api/auth/access?mode=admin&permission=people", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    })
      .then((response) => response.json())
      .then((result: { allowed?: boolean }) => setCanManageProtectedDocuments(Boolean(result.allowed)))
      .catch(() => setCanManageProtectedDocuments(false));
  }, []);

  useEffect(() => {
    if (!canManageProtectedDocuments) {
      setVisibility("worker-visible");
      if (!workerCareDocumentTypes.includes(documentType as typeof workerCareDocumentTypes[number])) {
        setDocumentType(workerCareDocumentTypes[0]);
      }
    }
  }, [canManageProtectedDocuments, documentType]);

  useEffect(() => {
    function syncDataMode() {
      setRealMode(isRealModeEnabled());
    }

    syncDataMode();
    window.addEventListener("empowernotes:data-mode-updated", syncDataMode);
    return () => window.removeEventListener("empowernotes:data-mode-updated", syncDataMode);
  }, []);

  useEffect(() => {
    if (!allParticipants.some((participant) => participant.id === clientId) && allParticipants[0]) {
      setClientId(allParticipants[0].id);
      return;
    }

    if (!allParticipants.length && clientId) {
      setClientId("");
    }
  }, [allParticipants, clientId]);

  async function saveUploadMetadata() {
    if (!selectedClient) {
      setMessage("Add a client before uploading documents.");
      return;
    }

    if (!expiryDate) {
      setMessage("Add the document expiry date before saving so reminders are accurate.");
      return;
    }

    setSaving(true);
    setSaveFailed(false);
    setMessage("Saving document to this organisation...");
    const organisationId = await getCurrentOrganisationId();
    const filePath = pendingFilePath || buildDocumentStoragePath({
      organisationId,
      participantId: selectedClient.id,
      documentType,
      fileName: selectedFile?.name || fileName
    });
    if (!pendingFilePath) setPendingFilePath(filePath);
    const documentId = pendingDocumentId || createDocumentId();
    if (!pendingDocumentId) setPendingDocumentId(documentId);
    const documentRecord = {
      id: documentId,
      participantId: selectedClient.id,
      clientName: selectedClient.name,
      type: documentType,
      status: "Metadata saved, file pending upload",
      visibility,
      confidence: 0,
      startDate,
      expiryDate,
      fileName: selectedFile?.name || fileName,
      filePath,
      storageBucket: "participant-documents",
      fileSizeBytes: selectedFile?.size || 0,
      savedAt: new Date().toISOString()
    };
    const result = await saveTenantDocumentRecord(documentRecord);

    if (result.error && result.error.includes("allows")) {
      setMessage(result.error);
      setSaveFailed(true);
      setSaving(false);
      return;
    }

    if (!result.savedToCloud) {
      setMessage(`Cloud save failed, so the file was not uploaded. ${result.error || "Try again."}`);
      setSaveFailed(true);
      setSaving(false);
      return;
    }

    const uploadResult = selectedFile ? await uploadTenantDocumentFile(selectedFile, filePath) : { uploaded: false, error: "No file selected; metadata saved only." };
    if (selectedFile && !uploadResult.uploaded) {
      setMessage(`Document details saved, but the private file upload stopped: ${uploadResult.error}`);
      setSaveFailed(true);
      setSaving(false);
      return;
    }

    if (selectedFile) {
      const completedResult = await saveTenantDocumentRecord({ ...documentRecord, status: "Uploaded, awaiting verification" });
      if (!completedResult.savedToCloud) {
        setMessage(`The file uploaded, but final verification status could not be saved. ${completedResult.error || "Retry the upload."}`);
        setSaveFailed(true);
        setSaving(false);
        return;
      }
    }

    const fileText = selectedFile ? "File uploaded to private storage." : "No file selected; document metadata saved only.";
    const shouldParseAgreement = Boolean(selectedFile && /service agreement|pricing agreement/i.test(documentType));
    if (shouldParseAgreement) {
      const token = getStoredAccessToken();
      setMessage(`${documentType} saved. Reading agreed rates for review...`);
      const parseResponse = await fetch("/api/billing/parse-service-agreement", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ documentId })
      });
      const parsed = await parseResponse.json() as { items?: unknown[]; error?: string };
      setMessage(parseResponse.ok
        ? `${documentType} saved. ${parsed.items?.length || 0} rate${parsed.items?.length === 1 ? "" : "s"} are ready for review in Invoicing.`
        : `${documentType} saved, but automatic rate extraction stopped. ${parsed.error || "Open Invoicing to retry."}`);
    } else {
      setMessage(`${documentType} saved for ${selectedClient.name}. Saved to this organisation. ${fileText}`);
    }
    setPendingDocumentId("");
    setPendingFilePath("");
    markTrialStepComplete("upload-document");
    window.dispatchEvent(new Event(documentsUpdatedEvent));
    setSaving(false);
  }

  function selectFile(file: File | undefined) {
    setFileName(file?.name || "");
    setSelectedFile(file || null);
  }

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Client document upload</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Upload to a specific client</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Upload direct-care documents to the relevant client so authorised workers can implement current health and support guidance.</p>
        </div>
        <StatusBadge label="Client required" tone="blue" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <label className="text-sm font-semibold text-slate-700">
          Client
          <select className="mt-2 w-full rounded-md border border-slate-300 p-3" required value={clientId} onChange={(event) => setClientId(event.target.value)}>
            {!allParticipants.length ? <option value="">Add a client first</option> : null}
            {allParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Document type
          <select className="mt-2 w-full rounded-md border border-slate-300 p-3" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
            <optgroup label="Direct care and health">
              {workerCareDocumentTypes.map((type) => <option key={type}>{type}</option>)}
            </optgroup>
            {canManageProtectedDocuments ? (
              <optgroup label="Protected organisation records">
                {protectedDocumentTypes.map((type) => <option key={type}>{type}</option>)}
              </optgroup>
            ) : null}
          </select>
        </label>
        {canManageProtectedDocuments ? (
          <label className="text-sm font-semibold text-slate-700">
            Visibility
            <select className="mt-2 w-full rounded-md border border-slate-300 p-3" value={visibility} onChange={(event) => setVisibility(event.target.value as "worker-visible" | "manager-only")}>
              <option value="worker-visible">Direct-care team</option>
              <option value="manager-only">Managers only</option>
            </select>
          </label>
        ) : (
          <div className="rounded-md border border-teal-100 bg-teal-50 p-3 text-sm">
            <p className="font-semibold text-teal-900">Direct-care team</p>
            <p className="mt-1 text-teal-800">Only approved care documents can be uploaded here.</p>
          </div>
        )}
        <label className="text-sm font-semibold text-slate-700">
          Start date
          <input className="mt-2 w-full rounded-md border border-slate-300 p-3" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Expiry date
          <input className="mt-2 w-full rounded-md border border-slate-300 p-3" type="date" required value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Private file
          <input className="mt-2 w-full rounded-md border border-slate-300 p-2" type="file" onChange={(event) => selectFile(event.target.files?.[0])} />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {allParticipants.map((participant) => {
          const colourSchemeId = "colourSchemeId" in participant && typeof participant.colourSchemeId === "string" ? participant.colourSchemeId : undefined;
          const colour = getClientColourScheme(participant.id, colourSchemeId);
          return (
            <div key={participant.id} className={cn("flex items-center gap-3 rounded-md border p-3", colour.border, colour.panel)}>
              <span className={cn("grid h-9 w-9 place-items-center rounded-md text-xs font-bold", colour.avatar)}>{participant.initials}</span>
              <div>
                <p className={cn("text-sm font-semibold", colour.text)}>{participant.name}</p>
                <p className="text-xs text-slate-600">Uploads use this client stream</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={saveUploadMetadata} disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-lift disabled:cursor-not-allowed disabled:bg-slate-400">
          <FileUp size={18} aria-hidden="true" />
          {saving ? "Saving..." : saveFailed ? "Retry upload" : "Upload to client"}
        </button>
        <a href="/documents" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-ink hover:border-teal-400">
          <UserRoundCheck size={18} aria-hidden="true" />
          Check client file list
        </a>
      </div>
      {message ? <p aria-live="polite" className={cn("mt-3 rounded-md px-3 py-2 text-sm font-semibold", saveFailed ? "bg-red-50 text-red-700" : saving ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700")}>{message}</p> : null}
      <p className="mt-3 text-sm text-slate-600">Files remain private. Signed-in users save documents to the selected client record inside this organisation.</p>
    </Card>
  );
}
