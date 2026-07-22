"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Save } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { createHouseId, getTenantHouses, saveTenantHouse, type HouseRecord } from "@/lib/house-records";

const serviceTypes = ["SIL house", "Supported accommodation", "Community access hub", "In-home support", "Day program", "Short-term accommodation", "Other service"];

export function HouseManagementCard() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [serviceType, setServiceType] = useState(serviceTypes[0]);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const assignedClientNames = useMemo(() => {
    return (ids: string[]) => clients.filter((client) => ids.includes(client.id)).map((client) => client.name).join(", ") || "No clients assigned yet";
  }, [clients]);

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    const [tenantClients, tenantHouses] = await Promise.all([
      getTenantClients().catch(() => []),
      getTenantHouses().catch(() => [])
    ]);
    setClients(tenantClients);
    setHouses(tenantHouses);
  }

  function toggleClient(clientId: string) {
    setClientIds((current) => current.includes(clientId) ? current.filter((item) => item !== clientId) : [...current, clientId]);
  }

  async function saveHouse() {
    const cleanName = name.trim();
    if (!cleanName) {
      setMessage("Add the house or service location name before saving.");
      return;
    }

    const result = await saveTenantHouse({
      id: createHouseId(cleanName),
      name: cleanName,
      address: address.trim(),
      serviceType,
      clientIds,
      createdAt: new Date().toISOString()
    });

    setMessage(result.savedToCloud ? `${cleanName} saved to this organisation.` : `${cleanName} saved locally. Sign in to save it to this organisation's Supabase space.`);
    setName("");
    setAddress("");
    setClientIds([]);
    await loadRecords();
  }

  return (
    <Card className="border-sky-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-sky-50 text-sky-800">
            <Building2 size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">House and service locations</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Group clients by house</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Assign clients to the house or service they receive support from so notes, incidents, and reports keep the correct service context.</p>
          </div>
        </div>
        <StatusBadge label={`${houses.length} houses`} tone="blue" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">
          House / service name
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Opal House" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Service type
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
            {serviceTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Address / area
          <input className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Suburb, address, or service area" />
        </label>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-slate-700">Clients in this house/service</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!clients.length ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">Add clients first, then return to assign them to houses.</div>
          ) : null}
          {clients.map((client) => (
            <label key={client.id} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={clientIds.includes(client.id)} onChange={() => toggleClient(client.id)} />
              <span className="font-semibold text-ink">{client.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={saveHouse} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-lift">
          <Save size={17} aria-hidden="true" />
          Save house
        </button>
        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </div>

      <div className="mt-5 grid gap-3">
        {houses.map((house) => (
          <div key={house.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-ink">{house.name}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{house.serviceType}{house.address ? ` - ${house.address}` : ""}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">Clients: {assignedClientNames(house.clientIds)}</p>
              </div>
              <StatusBadge label={`${house.clientIds.length} clients`} tone={house.clientIds.length ? "green" : "amber"} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
