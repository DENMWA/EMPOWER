"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, MessageSquareText, UserRound } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getTenantHouses, houseHasClient, type HouseRecord } from "@/lib/house-records";
import { getSavedIncidentReports, type StoredIncidentReport } from "@/lib/incident-records";
import { filterByParticipantAccess } from "@/lib/user-access";

export function IncidentManagerResponses() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [selectedHouseId, setSelectedHouseId] = useState("all");
  const [reports, setReports] = useState<StoredIncidentReport[]>([]);
  const accessibleClients = useMemo(() => filterByParticipantAccess(clients), [clients]);
  const selectedClient = accessibleClients.find((client) => client.id === selectedClientId);
  const resolvedReports = useMemo(
    () => reports
      .map((report) => resolveReportContext(report, clients, houses))
      .filter((item) => accessibleClients.some((client) => client.id === item.client?.id)),
    [accessibleClients, clients, houses, reports]
  );
  const filteredReports = useMemo(() => {
    return resolvedReports.filter((item) => {
      const clientMatch = selectedClientId === "all" || item.client?.id === selectedClientId;
      const houseMatch = selectedHouseId === "all" || item.house?.id === selectedHouseId;
      return clientMatch && houseMatch;
    });
  }, [resolvedReports, selectedClientId, selectedHouseId]);
  const availableHouses = useMemo(
    () => houses.filter((house) =>
      accessibleClients.some((client) => houseHasClient(house, client))
      && (selectedClientId === "all" || (selectedClient ? houseHasClient(house, selectedClient) : false))
    ),
    [accessibleClients, houses, selectedClient, selectedClientId]
  );

  useEffect(() => {
    getTenantClients().then(setClients).catch(() => setClients([]));
    getTenantHouses().then(setHouses).catch(() => setHouses([]));
    loadReports();
    window.addEventListener("empowernotes:retained-records-updated", loadReports);
    return () => window.removeEventListener("empowernotes:retained-records-updated", loadReports);
  }, []);

  async function loadReports() {
    const saved = await getSavedIncidentReports().catch(() => []);
    setReports(saved.map((item) => item.report).filter((report) => report.status !== "Draft"));
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-sky-50 text-sky-800">
            <MessageSquareText size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Manager responses</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Submitted incident feedback</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">After an authorised manager reviews a submitted incident, their response appears here for staff visibility.</p>
          </div>
        </div>
        <StatusBadge label={`${filteredReports.length} submitted incidents`} tone="blue" />
      </div>

      <label className="mt-5 grid max-w-md gap-2 text-sm font-semibold text-slate-700">
        View responses for
        <select
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3"
          value={selectedClientId}
          onChange={(event) => {
            setSelectedClientId(event.target.value);
            setSelectedHouseId("all");
          }}
        >
          <option value="all">All clients</option>
          {accessibleClients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>

      <label className="mt-4 grid max-w-md gap-2 text-sm font-semibold text-slate-700">
        View house/service
        <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3" value={selectedHouseId} onChange={(event) => setSelectedHouseId(event.target.value)}>
          <option value="all">All assigned houses/services</option>
          {availableHouses.map((house) => <option key={house.id} value={house.id}>{house.name} - {house.serviceType}</option>)}
        </select>
      </label>

      <div className="mt-5 grid gap-3">
        {!filteredReports.length ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="font-semibold text-ink">No submitted incidents yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Submit an incident report and it will appear here once saved for manager review.</p>
          </div>
        ) : null}

        {filteredReports.map(({ report, client, house }) => {
          const colour = getClientColourScheme(client?.id || report.participantId, client?.colourSchemeId);
          return (
            <div key={`${client?.id || report.participantId}-${house?.id || report.houseId || "unassigned-house"}-${report.incidentId}`} className={`rounded-md border border-l-4 bg-slate-50 p-4 ${colour.border}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{report.incidentId}</p>
                  <p className="mt-1 text-sm text-slate-600">{report.date} at {report.time} - {report.incidentTypes.join(", ") || "Incident"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${colour.badge}`}><UserRound size={15} aria-hidden="true" />{client?.name || report.participant || "Client not linked"}</span>
                    <span className="inline-flex min-h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"><Building2 size={15} aria-hidden="true" />{house ? `${house.name} - ${house.serviceType}` : report.houseName || "House/service not linked"}</span>
                  </div>
                </div>
                <StatusBadge label={report.status} tone={report.status === "Locked" ? "green" : report.status === "Needs Review" ? "amber" : "blue"} />
              </div>
              <div className="mt-3 rounded-md bg-white p-3">
                <p className="text-sm font-semibold text-ink">Manager response</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.managerReview || "Awaiting manager response."}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function resolveReportContext(report: StoredIncidentReport, clients: ClientRecord[], houses: HouseRecord[]) {
  const client = clients.find((item) => item.id === report.participantId)
    || clients.find((item) => normalise(item.name) === normalise(report.participant));
  const assignedHouses = client ? houses.filter((item) => houseHasClient(item, client)) : [];
  const house = houses.find((item) => item.id === report.houseId)
    || houses.find((item) => normalise(item.name) === normalise(report.houseName))
    || (client ? houses.find((item) => item.id === client.primaryHouseId) : undefined)
    || (client ? houses.find((item) => normalise(item.name) === normalise(client.primaryHouseName)) : undefined)
    || (assignedHouses.length === 1 ? assignedHouses[0] : undefined);
  return { report, client, house };
}

function normalise(value: string | undefined) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
