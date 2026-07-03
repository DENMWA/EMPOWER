"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, ShieldAlert, UserRoundPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { documents, participants, progressNotes, type Participant } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

type ReportClient = Participant & { colourSchemeId?: string };

export function ClientReportColourCards() {
  const [storedClients, setStoredClients] = useState<ClientRecord[]>([]);
  const allParticipants: ReportClient[] = [...participants, ...storedClients];

  useEffect(() => {
    getTenantClients().then(setStoredClients).catch(() => setStoredClients([]));
  }, []);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Client colour reporting</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Client-specific dashboard signals</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Each client has a consistent colour across profiles and admin reporting, making risk, evidence, and support progress easier to scan.</p>
        </div>
        <Link href="/admin/clients/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
          <UserRoundPlus size={18} aria-hidden="true" />
          Add client
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {allParticipants.map((participant) => {
          const colour = getClientColourScheme(participant.id, participant.colourSchemeId);
          const notes = progressNotes.filter((note) => note.participantId === participant.id);
          const participantDocuments = documents.filter((document) => document.participantId === participant.id);
          const incidentSignals = notes.reduce((total, note) => total + note.incidentFlags.length, 0) + participant.riskAlerts.length;
          const averageScore = notes.length === 0 ? 0 : Math.round(notes.reduce((total, note) => total + note.score, 0) / notes.length);
          const completion = Math.max(18, Math.min(100, averageScore || 64));

          return (
            <Link key={participant.id} href="/participants" className={cn("group rounded-md border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lift focus:outline focus:outline-2 focus:outline-teal-700", colour.border)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn("grid h-11 w-11 place-items-center rounded-md text-sm font-bold", colour.avatar)}>{participant.initials}</span>
                  <div>
                    <h3 className="font-semibold text-ink">{participant.name}</h3>
                    <p className="text-xs font-medium text-slate-500">{colour.label} client stream</p>
                  </div>
                </div>
                <span className={cn("rounded-md px-2.5 py-1 text-xs font-semibold", colour.badge)}>{notes.length} notes</span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={cn("h-full rounded-full", colour.bar)} style={{ width: `${completion}%` }} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Signal icon={FileText} label="Documents" value={participantDocuments.length} />
                <Signal icon={ShieldAlert} label="Risk signals" value={incidentSignals} />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{participant.supportNeeds}</p>
              <span className="mt-4 inline-flex min-h-10 items-center rounded-md bg-slate-50 px-3 text-sm font-semibold text-teal-900 transition group-hover:bg-teal-700 group-hover:text-white">
                Open profile
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function Signal({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={15} aria-hidden="true" />
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
