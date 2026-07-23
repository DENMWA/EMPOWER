"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { ParticipantProfile } from "@/components/participants/ParticipantProfile";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getTenantDocumentRecords, type StoredDocumentRecord } from "@/lib/document-records";
import { getSavedIncidentReports, type StoredIncidentReport } from "@/lib/incident-records";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";
import { accessChangedEvent, filterByParticipantAccess } from "@/lib/user-access";

export function ClientProfiles({ admin = false }: { admin?: boolean }) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [documents, setDocuments] = useState<StoredDocumentRecord[]>([]);
  const [incidents, setIncidents] = useState<StoredIncidentReport[]>([]);
  const [progressNotes, setProgressNotes] = useState<RetainedRecord[]>([]);
  const visibleClients = admin ? clients : filterByParticipantAccess(clients);

  useEffect(() => {
    refreshClientRecords();
  }, []);

  useEffect(() => {
    function refreshClients() {
      refreshClientRecords();
    }

    window.addEventListener(accessChangedEvent, refreshClients);
    window.addEventListener("empowernotes:documents-updated", refreshClients);
    window.addEventListener("empowernotes:retained-records-updated", refreshClients);
    return () => {
      window.removeEventListener(accessChangedEvent, refreshClients);
      window.removeEventListener("empowernotes:documents-updated", refreshClients);
      window.removeEventListener("empowernotes:retained-records-updated", refreshClients);
    };
  }, []);

  async function refreshClientRecords() {
    const [savedClients, savedDocuments, savedIncidents, savedProgressNotes] = await Promise.all([
      getTenantClients().catch(() => []),
      getTenantDocumentRecords().catch(() => []),
      getSavedIncidentReports().then((items) => items.map((item) => item.report)).catch(() => []),
      getTenantRetainedRecords("progress-note").catch(() => [])
    ]);

    setClients(savedClients);
    setDocuments(savedDocuments);
    setIncidents(savedIncidents);
    setProgressNotes(savedProgressNotes);
  }

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
      <div className="grid gap-6 lg:grid-cols-2">
        {visibleClients.map((client) => (
          <ParticipantProfile
            key={client.id}
            participant={client}
            colourSchemeId={client.colourSchemeId}
            stats={getClientProfileStats(client, { documents, incidents, progressNotes })}
          />
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
