"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getClientColourScheme } from "@/lib/client-colours";
import type { ClientRecord } from "@/lib/client-records";
import type { StoredIncidentReport } from "@/lib/incident-records";
import { cn } from "@/lib/utils";

function isActioned(report: StoredIncidentReport) {
  const review = (report.managerReview || "").trim().toLowerCase();
  return report.status === "Locked" || Boolean(review && !review.startsWith("pending manager review"));
}

export function ClientIncidentMetrics({ clients, incidents }: { clients: ClientRecord[]; incidents: StoredIncidentReport[] }) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedWeek, setSelectedWeek] = useState(5);

  useEffect(() => {
    if (!clients.some((client) => client.id === selectedClientId)) setSelectedClientId(clients[0]?.id || "");
  }, [clients, selectedClientId]);

  const selectedClient = clients.find((client) => client.id === selectedClientId) || clients[0];
  const selectedIncidents = useMemo(() => incidents.filter((incident) => incident.participantId === selectedClient?.id), [incidents, selectedClient?.id]);
  const colour = getClientColourScheme(selectedClient?.id || "client", selectedClient?.colourSchemeId);
  const weeklyTrend = useMemo(() => buildWeeklyTrend(selectedIncidents), [selectedIncidents]);
  const maximum = Math.max(1, ...weeklyTrend.map((point) => point.count));
  const actioned = selectedIncidents.filter(isActioned).length;
  const open = selectedIncidents.filter((report) => report.status === "Submitted" || report.status === "Needs Review").length;
  const submitted = selectedIncidents.filter((report) => report.status !== "Draft").length;
  const harmSignals = selectedIncidents.filter((report) => Boolean(report.injurySummary?.trim() || report.markers?.length || report.propertyDamage?.bodilyInjury)).length;
  const propertyDamage = selectedIncidents.filter((report) => report.propertyDamage?.involved).length;
  const actionRate = selectedIncidents.length ? Math.round((actioned / selectedIncidents.length) * 100) : 0;
  const selectedTrendPoint = weeklyTrend[selectedWeek] || weeklyTrend[weeklyTrend.length - 1];

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-teal-900 bg-navy p-5 text-white">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-200">Client incident intelligence</p>
          <h2 className="mt-2 text-2xl font-bold">Decision signals for every client</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">Select a client to review their incident trend, response status, harm signals, and service context without mixing records.</p>
        </div>
        <StatusBadge label={`${clients.length} colour-coded clients`} tone="blue" />
      </div>

      {!clients.length ? <div className="p-5"><p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">Add clients in Admin to create their incident reporting stream.</p></div> : (
        <div className="grid gap-0 xl:grid-cols-[300px_1fr]">
          <div className="border-b border-slate-200 bg-slate-50 p-4 xl:border-b-0 xl:border-r">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Select client</p>
            <div className="grid max-h-[520px] gap-2 overflow-y-auto">
              {clients.map((client) => {
                const clientColour = getClientColourScheme(client.id, client.colourSchemeId);
                const count = incidents.filter((incident) => incident.participantId === client.id).length;
                const active = client.id === selectedClient?.id;
                return (
                  <button key={client.id} type="button" onClick={() => { setSelectedClientId(client.id); setSelectedWeek(5); }} aria-pressed={active} className={cn("flex min-h-14 items-center justify-between gap-3 rounded-md border border-l-4 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline focus:outline-2 focus:outline-teal-700", clientColour.border, active && "ring-2 ring-teal-200")}>
                    <span><span className="block font-semibold text-ink">{client.name}</span><span className={cn("mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold", clientColour.badge)}>{clientColour.label} stream</span></span>
                    <span className="text-lg font-bold text-ink">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5">
            <div className={cn("rounded-md border border-l-4 p-4", colour.border, colour.panel)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected client</p><h3 className={cn("mt-1 text-2xl font-bold", colour.text)}>{selectedClient?.name}</h3><p className="mt-1 text-sm text-slate-600">{selectedClient?.primaryHouseName || selectedClient?.serviceName || "Service not assigned"}</p></div>
                <StatusBadge label={`${actionRate}% actioned`} tone={actionRate >= 90 ? "green" : selectedIncidents.length ? "amber" : "blue"} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <ClientMetric icon={AlertTriangle} label="Incidents" value={selectedIncidents.length} tone="red" />
              <ClientMetric icon={CheckCircle2} label="Submitted" value={submitted} tone="green" />
              <ClientMetric icon={Clock3} label="Open reviews" value={open} tone="amber" />
              <ClientMetric icon={ShieldAlert} label="Injury signals" value={harmSignals} tone="red" />
              <ClientMetric icon={ShieldAlert} label="Property damage" value={propertyDamage} tone="blue" />
            </div>

            <div className="mt-5 rounded-md border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-semibold text-ink">Six-week incident trend</h4><p className="mt-1 text-sm text-slate-600">Select a bar for the exact weekly count.</p></div><span className={cn("rounded-md px-3 py-1 text-sm font-bold", colour.badge)}>{selectedTrendPoint.label}: {selectedTrendPoint.count}</span></div>
              <div className="mt-5 flex h-52 items-end gap-3 border-b border-l border-slate-300 px-3 pt-3">
                {weeklyTrend.map((point, index) => (
                  <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">{point.count}</span>
                    <button type="button" onClick={() => setSelectedWeek(index)} aria-label={`${point.label}: ${point.count} incidents`} aria-pressed={selectedWeek === index} className={cn("w-full rounded-t-md transition hover:brightness-90 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-teal-700", colour.bar, selectedWeek === index && "ring-2 ring-ink ring-offset-2")} style={{ height: `${Math.max(10, (point.count / maximum) * 150)}px` }} />
                    <span className="truncate text-xs font-semibold text-slate-500">{point.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function ClientMetric({ icon: Icon, label, value, tone }: { icon: typeof AlertTriangle; label: string; value: number; tone: "red" | "green" | "amber" | "blue" }) {
  const tones = { red: "bg-red-50 text-red-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-800", blue: "bg-sky-50 text-sky-700" };
  return <div className={cn("rounded-md p-3", tones[tone])}><Icon size={17} aria-hidden="true" /><p className="mt-2 text-xs font-semibold">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}

function buildWeeklyTrend(incidents: StoredIncidentReport[]) {
  const currentWeek = startOfWeek(new Date());
  return Array.from({ length: 6 }, (_, index) => {
    const start = addDays(currentWeek, (index - 5) * 7);
    const end = addDays(start, 7);
    return {
      label: start.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
      count: incidents.filter((incident) => {
        const date = new Date(`${incident.date}T00:00:00`);
        return !Number.isNaN(date.getTime()) && date >= start && date < end;
      }).length
    };
  });
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
