"use client";

import { useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, ClipboardCheck } from "lucide-react";
import { PdfDownloadButton } from "@/components/admin/PdfDownloadButton";
import { Card, StatusBadge } from "@/components/ui";
import type { ClientRecord } from "@/lib/client-records";
import type { StoredDocumentRecord } from "@/lib/document-records";
import { houseHasClient, type HouseRecord } from "@/lib/house-records";
import type { StoredIncidentReport } from "@/lib/incident-records";
import type { RosterShift } from "@/lib/roster";

type HouseComparisonReportProps = {
  houses: HouseRecord[];
  clients: ClientRecord[];
  incidents: StoredIncidentReport[];
  shifts: RosterShift[];
  documents: StoredDocumentRecord[];
};

type PieMetric = "incidents" | "actionedIncidents" | "openTasks";
const pieMetrics: Array<{ key: PieMetric; label: string }> = [
  { key: "incidents", label: "Incident share" },
  { key: "actionedIncidents", label: "Actioned incidents" },
  { key: "openTasks", label: "Open admin tasks" }
];
const pieColours = ["var(--chart-sea)", "var(--chart-sky)", "var(--chart-emerald)", "var(--chart-amber)", "var(--chart-red)", "var(--chart-navy)", "var(--chart-slate)", "var(--chart-gold)"];

function incidentIsActioned(report: StoredIncidentReport) {
  const review = (report.managerReview || "").trim().toLowerCase();
  return report.status === "Locked" || Boolean(review && !review.startsWith("pending manager review"));
}

export function HouseComparisonReport({ houses, clients, incidents, shifts, documents }: HouseComparisonReportProps) {
  const [pieMetric, setPieMetric] = useState<PieMetric>("incidents");
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const rows = houses.map((house) => {
    const houseClients = clients.filter((client) => houseHasClient(house, client));
    const operationalClientIds = new Set(clients.filter((client) => resolveClientHouseId(client, houses) === house.id).map((client) => client.id));
    const houseIncidents = incidents.filter((incident) => incident.houseId === house.id || (incident.houseId === "unassigned-house" && operationalClientIds.has(incident.participantId)));
    const actionedIncidents = houseIncidents.filter(incidentIsActioned).length;
    const openIncidentTasks = houseIncidents.filter((incident) => incident.status === "Submitted" || incident.status === "Needs Review").length;
    const completedShifts = shifts.filter((shift) => {
      const location = shift.location.trim().toLowerCase();
      const matchesLocation = Boolean(location && [house.name, house.address].some((value) => value.trim().toLowerCase() === location));
      return (matchesLocation || operationalClientIds.has(shift.participantId)) && ["Completed", "Note Required", "Note Completed"].includes(shift.status);
    });
    const openShiftTasks = completedShifts.filter((shift) => shift.status === "Note Required" || (shift.noteRequired && !shift.noteCompleted)).length;
    const houseDocuments = documents.filter((document) => operationalClientIds.has(document.participantId));
    const openDocumentTasks = houseDocuments.filter((document) => !document.status.toLowerCase().includes("verified")).length;
    const totalTasks = houseIncidents.length + completedShifts.length + houseDocuments.length;
    const completedTasks = actionedIncidents + (completedShifts.length - openShiftTasks) + (houseDocuments.length - openDocumentTasks);
    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      id: house.id,
      name: house.name,
      serviceType: house.serviceType,
      clients: houseClients.length,
      incidents: houseIncidents.length,
      actionedIncidents,
      incidentActionRate: houseIncidents.length ? Math.round((actionedIncidents / houseIncidents.length) * 100) : 0,
      openIncidentTasks,
      openShiftTasks,
      openDocumentTasks,
      openTasks: openIncidentTasks + openShiftTasks + openDocumentTasks,
      completionRate
    };
  }).sort((a, b) => b.openTasks - a.openTasks || b.incidents - a.incidents || a.name.localeCompare(b.name));

  const maxIncidents = Math.max(1, ...rows.map((row) => row.incidents));
  const pieTotal = rows.reduce((total, row) => total + row[pieMetric], 0);
  let cumulativePercentage = 0;
  const pieSlices = rows.map((row, index) => {
    const percentage = pieTotal ? (row[pieMetric] / pieTotal) * 100 : 0;
    const start = cumulativePercentage;
    cumulativePercentage += percentage;
    return { ...row, percentage, start, end: cumulativePercentage, colour: pieColours[index % pieColours.length] };
  });
  const pieBackground = pieTotal
    ? `conic-gradient(${pieSlices.map((slice) => `${slice.colour} ${slice.start}% ${slice.end}%`).join(", ")})`
    : "#e2e8f0";
  const selectedSlice = pieSlices.find((slice) => slice.id === selectedHouseId);
  const reportLines = rows.flatMap((row) => [
    row.name,
    `Service: ${row.serviceType}`,
    `Clients: ${row.clients}`,
    `Incidents: ${row.incidents}`,
    `Incidents actioned: ${row.actionedIncidents} (${row.incidentActionRate}%)`,
    `Open admin tasks: ${row.openTasks}`,
    `Incident reviews: ${row.openIncidentTasks}; shift verifications: ${row.openShiftTasks}; document checks: ${row.openDocumentTasks}`,
    `Admin task completion: ${row.completionRate}%`,
    ""
  ]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 p-5 text-white">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-200">House comparison</p>
          <h2 className="mt-2 text-2xl font-bold">Incidents and admin workload by service</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Compare incident actioning, shift verification, document checks, and outstanding admin work without mixing houses together.</p>
        </div>
        <PdfDownloadButton filename="empowernotes-house-comparison.html" title="EmpowerNotes house comparison" lines={reportLines} />
      </div>

      {!rows.length ? (
        <div className="p-5">
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">Add houses and assign clients to build the comparison.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 border-b border-slate-200 p-5 lg:grid-cols-[260px_1fr] lg:items-center">
            <button
              type="button"
              className="relative mx-auto grid h-[220px] w-[220px] place-items-center rounded-full focus:outline focus:outline-2 focus:outline-teal-700"
              style={{ background: pieBackground }}
              onClick={() => setSelectedHouseId("")}
              aria-label={`House comparison chart for ${pieMetrics.find((metric) => metric.key === pieMetric)?.label}. Select a house from the legend for details.`}
            >
              <span className="grid h-[126px] w-[126px] place-items-center rounded-full bg-white px-3 text-center shadow-inner">
                <span>
                  <strong className="block text-2xl text-ink">{selectedSlice ? `${Math.round(selectedSlice.percentage)}%` : pieTotal}</strong>
                  <span className="mt-1 block text-xs font-semibold text-slate-600">{selectedSlice ? selectedSlice.name : pieMetrics.find((metric) => metric.key === pieMetric)?.label}</span>
                </span>
              </span>
            </button>
            <div>
              <div className="flex flex-wrap gap-2" aria-label="Select house chart measure">
                {pieMetrics.map((metric) => (
                  <button key={metric.key} type="button" onClick={() => { setPieMetric(metric.key); setSelectedHouseId(""); }} className={`min-h-10 rounded-md border px-3 text-sm font-semibold ${pieMetric === metric.key ? "border-teal-700 bg-teal-50 text-teal-800" : "border-slate-300 bg-white text-slate-700 hover:border-teal-400"}`}>{metric.label}</button>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {pieSlices.map((slice) => (
                  <button key={slice.id} type="button" onClick={() => setSelectedHouseId(slice.id)} className={`flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 text-left text-sm ${selectedHouseId === slice.id ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-400"}`}>
                    <span className="flex min-w-0 items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: slice.colour }} /><span className="truncate font-semibold text-ink">{slice.name}</span></span>
                    <span className="shrink-0 font-bold text-slate-700">{Math.round(slice.percentage)}%</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500">Live organisation data · refreshes every minute and when records change</p>
            </div>
          </div>
          <div className="grid gap-4 p-5 xl:grid-cols-2">
          {rows.map((row) => (
            <div key={row.id} className={`rounded-md border bg-white p-4 transition ${selectedHouseId === row.id ? "border-teal-500 ring-2 ring-teal-100" : selectedHouseId ? "border-slate-200 opacity-60" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-teal-50 text-teal-800"><Building2 size={19} aria-hidden="true" /></span>
                  <div>
                    <h3 className="font-bold text-ink">{row.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{row.serviceType} · {row.clients} clients</p>
                  </div>
                </div>
                <StatusBadge label={row.openTasks ? `${row.openTasks} open tasks` : "All clear"} tone={row.openTasks ? "amber" : "green"} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric icon={AlertTriangle} label="Incidents" value={row.incidents} tone="red" />
                <Metric icon={CheckCircle2} label="Actioned" value={`${row.incidentActionRate}%`} tone="green" />
                <Metric icon={ClipboardCheck} label="Shift tasks" value={row.openShiftTasks} tone="blue" />
                <Metric icon={ClipboardCheck} label="Doc checks" value={row.openDocumentTasks} tone="amber" />
              </div>

              <div className="mt-4 space-y-3">
                <ComparisonBar label="Incident volume" value={row.incidents} percent={Math.round((row.incidents / maxIncidents) * 100)} color="bg-red-500" />
                <ComparisonBar label="Incident actioning" value={`${row.actionedIncidents}/${row.incidents}`} percent={row.incidentActionRate} color="bg-emerald-600" />
                <ComparisonBar label="Admin task completion" value={`${row.completionRate}%`} percent={row.completionRate} color="bg-sky-600" />
              </div>
              {row.openIncidentTasks ? <p className="mt-4 text-sm font-semibold text-red-700">{row.openIncidentTasks} incident {row.openIncidentTasks === 1 ? "review requires" : "reviews require"} action.</p> : null}
            </div>
          ))}
          </div>
        </>
      )}
    </Card>
  );
}

function resolveClientHouseId(client: ClientRecord, houses: HouseRecord[]) {
  if (client.primaryHouseId) return client.primaryHouseId;
  const namedHouse = houses.find((house) => house.name.trim().toLowerCase() === client.primaryHouseName?.trim().toLowerCase());
  if (namedHouse) return namedHouse.id;
  const assigned = houses.filter((house) => houseHasClient(house, client));
  return assigned.length === 1 ? assigned[0].id : "";
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof AlertTriangle; label: string; value: string | number; tone: "red" | "green" | "blue" | "amber" }) {
  const tones = { red: "bg-red-50 text-red-700", green: "bg-emerald-50 text-emerald-700", blue: "bg-sky-50 text-sky-700", amber: "bg-amber-50 text-amber-800" };
  return <div className={`rounded-md p-3 ${tones[tone]}`}><Icon size={16} aria-hidden="true" /><p className="mt-2 text-xs font-semibold">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}

function ComparisonBar({ label, value, percent, color }: { label: string; value: string | number; percent: number; color: string }) {
  return <div><div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-semibold text-slate-700">{label}</span><span className="font-bold text-ink">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></div></div>;
}
