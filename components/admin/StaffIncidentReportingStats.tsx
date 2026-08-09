"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Users } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import type { StoredIncidentReport } from "@/lib/incident-records";
import type { StaffRecord } from "@/lib/staff-records";
import { cn } from "@/lib/utils";

function isActioned(report: StoredIncidentReport) {
  const review = (report.managerReview || "").trim().toLowerCase();
  return report.status === "Locked" || Boolean(review && !review.startsWith("pending manager review"));
}

export function StaffIncidentReportingStats({ incidents, staff }: { incidents: StoredIncidentReport[]; staff: StaffRecord[] }) {
  const [selectedReporterKey, setSelectedReporterKey] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const services = useMemo(() => Array.from(new Set(incidents.map((incident) => incident.houseName || "Unassigned service"))).sort(), [incidents]);
  const filteredIncidents = useMemo(() => serviceFilter === "all" ? incidents : incidents.filter((incident) => (incident.houseName || "Unassigned service") === serviceFilter), [incidents, serviceFilter]);
  const rows = useMemo(() => {
    const claimed = new Set<StoredIncidentReport>();
    const staffRows = staff.map((member) => {
      const reports = filteredIncidents.filter((incident) => {
        if (claimed.has(incident)) return false;
        const identityMatch = Boolean(member.authUserId && incident.reportedByUserId === member.authUserId);
        const nameMatch = normaliseName(member.name) === normaliseName(incident.reporter);
        const fallbackMatch = nameMatch && (!incident.reportedByUserId || !member.authUserId);
        if (identityMatch || fallbackMatch) claimed.add(incident);
        return identityMatch || fallbackMatch;
      });
      return buildRow({
        reporterKey: `staff:${member.id}`,
        reporter: member.name,
        role: member.roleLabel,
        linked: true,
        accountLinked: Boolean(member.authUserId),
        inviteStatus: member.inviteStatus,
        reports
      });
    });

    const unmatchedGroups = new Map<string, StoredIncidentReport[]>();
    filteredIncidents.filter((incident) => !claimed.has(incident)).forEach((incident) => {
      const reporterKey = incident.reportedByUserId || `name:${normaliseName(incident.reporter) || "unknown"}`;
      unmatchedGroups.set(reporterKey, [...(unmatchedGroups.get(reporterKey) || []), incident]);
    });
    const unmatchedRows = Array.from(unmatchedGroups, ([reporterKey, reports]) => buildRow({
      reporterKey: `legacy:${reporterKey}`,
      reporter: reports[0]?.reporter?.trim() || "Reporter not recorded",
      role: "Historical report",
      linked: false,
      accountLinked: false,
      inviteStatus: "Legacy",
      reports
    }));

    return [...staffRows, ...unmatchedRows].sort((a, b) => b.total - a.total || a.reporter.localeCompare(b.reporter));
  }, [filteredIncidents, staff]);
  const maximum = Math.max(1, ...rows.map((row) => row.total));
  const selected = rows.find((row) => row.reporterKey === selectedReporterKey) || rows[0];

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 p-5 text-white">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-200"><Users size={17} aria-hidden="true" />Staff reporting</p>
          <h2 className="mt-2 text-2xl font-bold">Incident reporting by staff</h2>
          <p className="mt-2 text-sm text-slate-300">Live reporting volume, submission completion, and manager action by recorded reporter.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={serviceFilter} onChange={(event) => { setServiceFilter(event.target.value); setSelectedReporterKey(""); }} className="min-h-10 rounded-md border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white focus:outline focus:outline-2 focus:outline-teal-300" aria-label="Filter staff incident statistics by service">
            <option className="text-ink" value="all">All services</option>
            {services.map((service) => <option className="text-ink" key={service} value={service}>{service}</option>)}
          </select>
          <StatusBadge label={`${staff.length} staff profiles - ${staff.filter((member) => member.authUserId).length} accounts linked`} tone={staff.length ? "green" : "blue"} />
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-3">
          {!rows.length ? <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">Add staff in Admin to create their live incident reporting stream.</div> : null}
          {rows.map((row) => {
            const share = filteredIncidents.length ? Math.round((row.total / filteredIncidents.length) * 100) : 0;
            const active = selected?.reporterKey === row.reporterKey;
            return (
              <button key={row.reporterKey} type="button" onClick={() => setSelectedReporterKey(row.reporterKey)} aria-pressed={active} className={cn("rounded-md border bg-white p-4 text-left transition hover:border-teal-400 focus:outline focus:outline-2 focus:outline-teal-700", active ? "border-teal-600 ring-1 ring-teal-600" : "border-slate-200")}>
                <div className="flex items-center justify-between gap-3"><span><span className="block font-semibold text-ink">{row.reporter}</span><span className="mt-0.5 block text-xs font-medium text-slate-500">{row.role} - {row.inviteStatus}</span></span><span className="text-sm font-bold text-teal-800">{row.total} reports</span></div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-sea transition-all" style={{ width: `${Math.max(4, (row.total / maximum) * 100)}%` }} /></div>
                <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500"><span>{share}% of reports</span><span>{row.actioned} actioned</span></div>
              </button>
            );
          })}
        </div>

        <div className="rounded-md border border-teal-200 bg-teal-50 p-5" aria-live="polite">
          <ClipboardCheck size={22} className="text-teal-700" aria-hidden="true" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal-800">Selected reporter</p>
          <h3 className="mt-1 text-xl font-bold text-ink">{selected?.reporter || "No reporting data"}</h3>
          {selected ? <p className="mt-1 text-sm font-semibold text-slate-600">{selected.role}{selected.accountLinked ? " - authenticated account linked" : selected.linked ? " - staff profile ready; awaiting account acceptance" : " - unmatched historical report"}</p> : null}
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <StaffMetric label="Filed" value={selected?.total || 0} />
            <StaffMetric label="Submitted" value={selected?.submitted || 0} />
            <StaffMetric label="Actioned" value={selected?.actioned || 0} />
            <StaffMetric label="Clients" value={selected?.clients || 0} />
          </dl>
        </div>
      </div>
    </Card>
  );
}

function normaliseName(value: string | undefined) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildRow({ reporterKey, reporter, role, linked, accountLinked, inviteStatus, reports }: {
  reporterKey: string;
  reporter: string;
  role: string;
  linked: boolean;
  accountLinked: boolean;
  inviteStatus: string;
  reports: StoredIncidentReport[];
}) {
  return {
    reporterKey,
    reporter,
    role,
    linked,
    accountLinked,
    inviteStatus,
    total: reports.length,
    submitted: reports.filter((report) => report.status !== "Draft").length,
    actioned: reports.filter(isActioned).length,
    clients: new Set(reports.map((report) => report.participantId).filter(Boolean)).size
  };
}

function StaffMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md bg-white p-3"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 text-2xl font-bold text-ink">{value}</dd></div>;
}
