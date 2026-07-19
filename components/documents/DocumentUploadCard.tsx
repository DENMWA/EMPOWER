"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUp, UserRoundCheck } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { createDocumentId, saveTenantDocumentRecord } from "@/lib/document-records";
import { participants } from "@/lib/sample-data";
import { markTrialStepComplete } from "@/lib/trial-run";
import { cn } from "@/lib/utils";

const coreDocumentTypes = [
  "NDIS Plan",
  "Behaviour support plan",
  "Risk assessment",
  "Communication profile",
  "Medical documents",
  "CHAP",
  "Service agreement"
];

const alliedHealthReportTypes = [
  "Allied Health Report",
  "Occupational Therapy Report",
  "Physiotherapy Report",
  "Speech Pathology Report",
  "Psychology Report",
  "Behaviour Support Practitioner Report",
  "Dietitian Report",
  "Exercise Physiology Report",
  "Podiatry Report",
  "Nursing Assessment Report"
];

export function DocumentUploadCard() {
  const [storedClients, setStoredClients] = useState<ClientRecord[]>([]);
  const [clientId, setClientId] = useState("client-b");
  const [documentType, setDocumentType] = useState("NDIS Plan");
  const [visibility, setVisibility] = useState<"worker-visible" | "manager-only">("worker-visible");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const allParticipants = useMemo(() => storedClients.length ? storedClients : participants, [storedClients]);
  const selectedClient = allParticipants.find((participant) => participant.id === clientId) ?? allParticipants[0];

  useEffect(() => {
    getTenantClients().then(setStoredClients).catch(() => setStoredClients([]));
  }, []);

  useEffect(() => {
    if (!allParticipants.some((participant) => participant.id === clientId) && allParticipants[0]) {
      setClientId(allParticipants[0].id);
    }
  }, [allParticipants, clientId]);

  async function saveUploadMetadata() {
    if (!selectedClient) {
      setMessage("Add a client before uploading documents.");
      return;
    }

    const result = await saveTenantDocumentRecord({
      id: createDocumentId(),
      participantId: selectedClient.id,
      clientName: selectedClient.name,
      type: documentType,
      status: "Uploaded, awaiting verification",
      visibility,
      confidence: 0,
      startDate,
      expiryDate: expiryDate || startDate,
      fileName,
      savedAt: new Date().toISOString()
    });

    if (result.error && result.error.includes("allows")) {
      setMessage(result.error);
      return;
    }

    const cloudText = result.savedToCloud ? "Saved to this organisation." : `Saved locally. ${result.error || "Sign in to save it to this organisation's Supabase space."}`;
    setMessage(`${documentType} saved for ${selectedClient.name}. ${cloudText}`);
    markTrialStepComplete("upload-document");
    window.dispatchEvent(new Event("empowernotes:documents-updated"));
  }

  function selectFile(file: File | undefined) {
    setFileName(file?.name || "");
  }

  return (
    <Card className="border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Client document upload</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Upload to a specific client</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Every document must be linked to a client before it enters the vault, keeping support plans, risk assessments, and evidence easy to find.</p>
        </div>
        <StatusBadge label="Client required" tone="blue" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <label className="text-sm font-semibold text-slate-700">
          Client
          <select className="mt-2 w-full rounded-md border border-slate-300 p-3" required value={clientId} onChange={(event) => setClientId(event.target.value)}>
            {allParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Document type
          <select className="mt-2 w-full rounded-md border border-slate-300 p-3" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
            <optgroup label="Core documents">
              {coreDocumentTypes.map((type) => <option key={type}>{type}</option>)}
            </optgroup>
            <optgroup label="Allied health reports">
              {alliedHealthReportTypes.map((type) => <option key={type}>{type}</option>)}
            </optgroup>
            <option>Other</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Visibility
          <select className="mt-2 w-full rounded-md border border-slate-300 p-3" value={visibility} onChange={(event) => setVisibility(event.target.value as "worker-visible" | "manager-only")}>
            <option value="worker-visible">worker-visible</option>
            <option value="manager-only">manager-only</option>
          </select>
        </label>
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
        <button type="button" onClick={saveUploadMetadata} className="inline-flex min-h-12 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-lift">
          <FileUp size={18} aria-hidden="true" />
          Upload to client
        </button>
        <a href="/documents" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-ink hover:border-teal-400">
          <UserRoundCheck size={18} aria-hidden="true" />
          Check client file list
        </a>
      </div>
      {message ? <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
      <p className="mt-3 text-sm text-slate-600">Files remain private. During browser testing, the file name and document metadata are retained locally; signed-in Supabase users also save the document record to the organisation.</p>
    </Card>
  );
}
