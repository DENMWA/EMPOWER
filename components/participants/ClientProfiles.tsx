"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { ParticipantProfile } from "@/components/participants/ParticipantProfile";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";

export function ClientProfiles() {
  const [clients, setClients] = useState<ClientRecord[]>([]);

  useEffect(() => {
    getTenantClients().then(setClients).catch(() => setClients([]));
  }, []);

  if (!clients.length) {
    return (
      <Card className="border-teal-100">
        <p className="text-sm font-semibold uppercase tracking-wide text-sea">No mock clients loaded</p>
        <h2 className="mt-1 text-2xl font-bold text-ink">Add your first real client profile</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Client profiles will appear here after an admin adds them. Each profile keeps its selected reporting colour across profiles, documents, notes, and admin dashboards.
        </p>
        <Link href="/admin/clients/new" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift">
          Add client
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {clients.map((client) => <ParticipantProfile key={client.id} participant={client} colourSchemeId={client.colourSchemeId} />)}
    </div>
  );
}
