"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { ParticipantProfile } from "@/components/participants/ParticipantProfile";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { accessChangedEvent, filterByParticipantAccess } from "@/lib/user-access";

export function ClientProfiles({ admin = false }: { admin?: boolean }) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const visibleClients = admin ? clients : filterByParticipantAccess(clients);

  useEffect(() => {
    getTenantClients().then(setClients).catch(() => setClients([]));
  }, []);

  useEffect(() => {
    function refreshClients() {
      getTenantClients().then(setClients).catch(() => setClients([]));
    }

    window.addEventListener(accessChangedEvent, refreshClients);
    return () => window.removeEventListener(accessChangedEvent, refreshClients);
  }, []);

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
        {visibleClients.map((client) => <ParticipantProfile key={client.id} participant={client} colourSchemeId={client.colourSchemeId} />)}
      </div>
    </div>
  );
}
