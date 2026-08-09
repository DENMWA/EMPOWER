"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { ParticipantProfile } from "@/components/participants/ParticipantProfile";
import { clientsUpdatedEvent, getTenantClients, type ClientRecord } from "@/lib/client-records";
import { documentsUpdatedEvent, getTenantDocumentRecords, type StoredDocumentRecord } from "@/lib/document-records";
import { getSavedIncidentReports, type StoredIncidentReport } from "@/lib/incident-records";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";
import { accessChangedEvent, filterByParticipantAccess } from "@/lib/user-access";
import { fullAdminRoles } from "@/lib/admin-permissions";
import { getStoredAccessToken } from "@/lib/supabase-rest";
import { Power, RotateCcw } from "lucide-react";

export function ClientProfiles({ admin = false }: { admin?: boolean }) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [documents, setDocuments] = useState<StoredDocumentRecord[]>([]);
  const [incidents, setIncidents] = useState<StoredIncidentReport[]>([]);
  const [progressNotes, setProgressNotes] = useState<RetainedRecord[]>([]);
  const [canControlLifecycle, setCanControlLifecycle] = useState(false);
  const [message, setMessage] = useState("");
  const visibleClients = admin ? clients : filterByParticipantAccess(clients);

  const refreshClientRecords = useCallback(async () => {
    const [savedClients, savedDocuments, savedIncidents, savedProgressNotes] = await Promise.all([
      getTenantClients(admin && canControlLifecycle).catch(() => []),
      getTenantDocumentRecords().catch(() => []),
      getSavedIncidentReports().then((items) => items.map((item) => item.report)).catch(() => []),
      getTenantRetainedRecords("progress-note").catch(() => [])
    ]);

    setClients(savedClients);
    setDocuments(savedDocuments);
    setIncidents(savedIncidents);
    setProgressNotes(savedProgressNotes);
  }, [admin, canControlLifecycle]);

  useEffect(() => {
    refreshClientRecords();
    if (admin) verifyLifecycleAccess();
  }, [admin, refreshClientRecords]);

  async function verifyLifecycleAccess() {
    const token = getStoredAccessToken();
    if (!token) return;
    try {
      const response = await fetch("/api/auth/access?mode=admin&permission=people", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = await response.json() as { allowed?: boolean; role?: string };
      setCanControlLifecycle(Boolean(result.allowed && result.role && fullAdminRoles.has(result.role)));
    } catch {
      setCanControlLifecycle(false);
    }
  }

  async function changeClientStatus(client: ClientRecord, status: "active" | "inactive") {
    const token = getStoredAccessToken();
    if (!token) return setMessage("Sign in before changing client access.");
    const response = await fetch("/api/admin/clients/status", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, status })
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) return setMessage(result.error || "The client status could not be updated.");
    setMessage(`${client.name} is now ${status === "inactive" ? "inactive" : "active"}. Historical records have been retained.`);
    await refreshClientRecords();
  }

  useEffect(() => {
    function refreshClients() {
      refreshClientRecords();
    }

    window.addEventListener(accessChangedEvent, refreshClients);
    window.addEventListener(clientsUpdatedEvent, refreshClients);
    window.addEventListener(documentsUpdatedEvent, refreshClients);
    window.addEventListener("empowernotes:retained-records-updated", refreshClients);
    return () => {
      window.removeEventListener(accessChangedEvent, refreshClients);
      window.removeEventListener(clientsUpdatedEvent, refreshClients);
      window.removeEventListener(documentsUpdatedEvent, refreshClients);
      window.removeEventListener("empowernotes:retained-records-updated", refreshClients);
    };
  }, [refreshClientRecords]);

  if (!visibleClients.length) {
    return (
      <Card className="border-teal-100">
        <p className="text-sm font-semibold uppercase tracking-wide text-sea">{admin ? "No saved clients yet" : "No assigned clients yet"}</p>
        <h2 className="mt-1 text-2xl font-bold text-ink">{admin ? "Add your first real client profile" : "Client access will appear here after admin assignment"}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {admin ? "Client profiles will appear here after an admin adds them. Workers can use this page to review support context before writing notes or completing incident records." : "Workers only see clients assigned to them by admin."}
        </p>
        {admin ? (
          <Link href="/admin/clients/new" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift">
            Add client
          </Link>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {message ? <p className="rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800" aria-live="polite">{message}</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        {visibleClients.map((client) => (
          <div key={client.id} className="space-y-2">
            {admin ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                <StatusBadge label={client.status === "inactive" ? "Inactive client" : "Active client"} tone={client.status === "inactive" ? "red" : "green"} />
                {canControlLifecycle ? client.status === "inactive" ? (
                  <button type="button" onClick={() => changeClientStatus(client, "active")} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-200 px-3 text-sm font-semibold text-emerald-700"><RotateCcw size={16} aria-hidden="true" />Reactivate</button>
                ) : (
                  <button type="button" onClick={() => changeClientStatus(client, "inactive")} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700"><Power size={16} aria-hidden="true" />Deactivate</button>
                ) : null}
              </div>
            ) : null}
            <ParticipantProfile
              participant={client}
              colourSchemeId={client.colourSchemeId}
              stats={getClientProfileStats(client, { documents, incidents, progressNotes })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function getClientProfileStats(client: ClientRecord, records: {
  documents: StoredDocumentRecord[];
  incidents: StoredIncidentReport[];
  progressNotes: RetainedRecord[];
}) {
  const clientDocuments = records.documents.filter((document) => document.participantId === client.id);
  const clientIncidents = records.incidents.filter((incident) => incident.participantId === client.id);
  const clientProgressNotes = records.progressNotes.filter((note) => {
    const bodyClient = extractField(note.body, "Client");
    return bodyClient === client.name || note.id.includes(client.id);
  });
  const activityDates = [...clientDocuments.map((item) => item.savedAt), ...clientIncidents.map((item) => `${item.date}T${item.time || "00:00"}`), ...clientProgressNotes.map((item) => item.savedAt)]
    .filter(Boolean)
    .sort();
  const latestActivity = activityDates[activityDates.length - 1];

  return {
    documents: clientDocuments.length,
    incidents: clientIncidents.length,
    progressNotes: clientProgressNotes.length,
    latestActivity
  };
}

function extractField(body: string, field: string) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}
