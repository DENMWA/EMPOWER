"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { ClientReportColourCards } from "@/components/admin/ClientReportColourCards";
import { ProgressNoteCollectionExport } from "@/components/notes/ProgressNoteCollectionExport";
import { PdfDownloadButton } from "@/components/admin/PdfDownloadButton";
import { ReportingInsightsChart } from "@/components/admin/ReportingInsightsChart";
import { SavedRecordsSummary } from "@/components/admin/SavedRecordsSummary";
import { ArrowRight, BarChart3, Building2, ClipboardCheck, Download, FileWarning, Radio, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import { getRosterReportSummary, type RosterReportPeriod, type RosterShift } from "@/lib/roster";
import { loadTenantRosterShifts } from "@/lib/roster-cloud";
import { documentsUpdatedEvent, getTenantDocumentRecords, type StoredDocumentRecord } from "@/lib/document-records";
import { getSavedIncidentReports, type StoredIncidentReport } from "@/lib/incident-records";
import { getTenantRetainedRecords, type RetainedRecord } from "@/lib/retained-records";
import { HouseComparisonReport } from "@/components/admin/HouseComparisonReport";
import { StaffIncidentReportingStats } from "@/components/admin/StaffIncidentReportingStats";
import { ClientIncidentMetrics } from "@/components/admin/ClientIncidentMetrics";
import { getTenantHouses, housesUpdatedEvent, type HouseRecord } from "@/lib/house-records";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getTenantStaffInvites, staffUpdatedEvent, type StaffRecord } from "@/lib/staff-records";

const periods: RosterReportPeriod[] = ["weekly", "fortnightly", "monthly"];
const reportSections = ["service-trends", "client-incidents", "staff-reporting", "house-comparison", "records", "exports"];

export default function AdminReportsPage() {
  const [savedDocuments, setSavedDocuments] = useState<StoredDocumentRecord[]>([]);
  const [savedIncidents, setSavedIncidents] = useState<StoredIncidentReport[]>([]);
  const [savedProgressNotes, setSavedProgressNotes] = useState<RetainedRecord[]>([]);
  const [savedRosterShifts, setSavedRosterShifts] = useState<RosterShift[]>([]);
  const [savedHouses, setSavedHouses] = useState<HouseRecord[]>([]);
  const [savedClients, setSavedClients] = useState<ClientRecord[]>([]);
  const [savedStaff, setSavedStaff] = useState<StaffRecord[]>([]);
  const [activeSection, setActiveSection] = useState("service-trends");
  const today = new Date().toISOString().slice(0, 10);
  const unverifiedDocuments = savedDocuments.filter((doc) => !doc.status.toLowerCase().includes("verified"));
  const incidentsAwaitingReview = savedIncidents.filter((incident) => incident.status === "Submitted" || incident.status === "Needs Review");
  const notesAwaitingCompletion = savedRosterShifts.filter((shift) => shift.status === "Note Required" || (shift.noteRequired && !shift.noteCompleted)).length;
  const linkedStaff = savedStaff.filter((staff) => staff.authUserId).length;
  const priorityCount = incidentsAwaitingReview.length + unverifiedDocuments.length + notesAwaitingCompletion;
  const priorityHref = incidentsAwaitingReview.length ? "#client-incidents" : unverifiedDocuments.length ? "#records" : notesAwaitingCompletion ? "#service-trends" : "#house-comparison";

  useEffect(() => {
    function loadReports() {
      getTenantDocumentRecords().then(setSavedDocuments).catch(() => setSavedDocuments([]));
      getSavedIncidentReports().then((items) => setSavedIncidents(items.map((item) => item.report))).catch(() => setSavedIncidents([]));
      getTenantRetainedRecords("progress-note").then(setSavedProgressNotes).catch(() => setSavedProgressNotes([]));
      loadTenantRosterShifts().then((result) => setSavedRosterShifts(result.shifts)).catch(() => setSavedRosterShifts([]));
      getTenantHouses().then(setSavedHouses).catch(() => setSavedHouses([]));
      getTenantClients().then(setSavedClients).catch(() => setSavedClients([]));
      getTenantStaffInvites().then(setSavedStaff).catch(() => setSavedStaff([]));
    }

    loadReports();
    const refreshInterval = window.setInterval(loadReports, 60000);
    window.addEventListener(documentsUpdatedEvent, loadReports);
    window.addEventListener("empowernotes:retained-records-updated", loadReports);
    window.addEventListener(housesUpdatedEvent, loadReports);
    window.addEventListener("empowernotes:roster-updated", loadReports);
    window.addEventListener(staffUpdatedEvent, loadReports);
    window.addEventListener("focus", loadReports);
    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener(documentsUpdatedEvent, loadReports);
      window.removeEventListener("empowernotes:retained-records-updated", loadReports);
      window.removeEventListener(housesUpdatedEvent, loadReports);
      window.removeEventListener("empowernotes:roster-updated", loadReports);
      window.removeEventListener(staffUpdatedEvent, loadReports);
      window.removeEventListener("focus", loadReports);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-18% 0px -62% 0px", threshold: [0.05, 0.25, 0.5] });
    reportSections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <AdminGate permission="reports">
      <PageHeader
        eyebrow="Admin reports"
        title="Status reports for documentation, roster, incidents, and evidence"
        description="Admin-only reporting views for weekly, fortnightly, and monthly operational health."
        actions={<StatusBadge label="Admin / owner only" tone="blue" />}
      />
      <Section className="space-y-6">
        <div className="report-command-band overflow-hidden rounded-md border border-slate-800 bg-slate-950 text-white shadow-lift">
          <div className="grid gap-6 p-5 lg:grid-cols-[1.35fr_1fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-md border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-200"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-300" /></span>Live intelligence</span>
                <span className="text-sm font-semibold text-slate-400">Refresh cycle: 60 seconds</span>
              </div>
              <h2 className="mt-4 text-3xl font-bold">Operational command view</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{priorityCount ? `${priorityCount} items currently require attention across incidents, evidence, and shift documentation.` : "No urgent reporting gaps detected across the current organisation records."}</p>
              <a href={priorityHref} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-teal-300 px-4 text-sm font-bold text-slate-950 shadow-sm hover:bg-teal-200 focus:outline focus:outline-2 focus:outline-teal-100">{priorityCount ? "Open priority intelligence" : "Review service performance"}<ArrowRight size={17} aria-hidden="true" /></a>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 sm:grid-cols-4 lg:grid-cols-2">
              <CommandMetric icon={ShieldCheck} label="Open incidents" value={incidentsAwaitingReview.length} tone="red" />
              <CommandMetric icon={FileWarning} label="Evidence gaps" value={unverifiedDocuments.length} tone="amber" />
              <CommandMetric icon={Building2} label="Live services" value={savedHouses.length} tone="sky" />
              <CommandMetric icon={Users} label="Linked staff" value={`${linkedStaff}/${savedStaff.length}`} tone="teal" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-white/10 bg-white/[0.03] px-5 py-3 text-xs font-semibold text-slate-400"><span className="inline-flex items-center gap-2 text-teal-200"><Radio size={14} aria-hidden="true" />Tenant-isolated live records</span><span>{savedClients.length} clients monitored</span><span>{savedProgressNotes.length} progress records</span><span>{savedIncidents.length} incident records</span></div>
        </div>

        <div className="sticky top-3 z-20 overflow-x-auto rounded-md border border-slate-200 bg-white/95 p-2 shadow-lift backdrop-blur">
          <nav className="flex min-w-max gap-2" aria-label="Report workspace sections">
            <ReportJump href="#service-trends" icon={BarChart3} label="Service trends" value={savedProgressNotes.length + savedIncidents.length} active={activeSection === "service-trends"} />
            <ReportJump href="#client-incidents" icon={ShieldCheck} label="Client incidents" value={savedClients.length} active={activeSection === "client-incidents"} />
            <ReportJump href="#staff-reporting" icon={Users} label="Staff reporting" value={savedStaff.length} active={activeSection === "staff-reporting"} />
            <ReportJump href="#house-comparison" icon={Building2} label="Houses" value={savedHouses.length} active={activeSection === "house-comparison"} />
            <ReportJump href="#records" icon={ClipboardCheck} label="Records" value={savedProgressNotes.length} active={activeSection === "records"} />
            <ReportJump href="#exports" icon={Download} label="Exports" value={periods.length} active={activeSection === "exports"} />
          </nav>
        </div>
        <div id="service-trends" className="scroll-mt-24"><ReportingInsightsChart /></div>
        <div id="client-incidents" className="scroll-mt-24"><ClientIncidentMetrics clients={savedClients} incidents={savedIncidents} /></div>
        <div id="staff-reporting" className="scroll-mt-24"><StaffIncidentReportingStats incidents={savedIncidents} staff={savedStaff} /></div>
        <div id="house-comparison" className="scroll-mt-24"><HouseComparisonReport houses={savedHouses} clients={savedClients} incidents={savedIncidents} shifts={savedRosterShifts} documents={savedDocuments} /></div>
        <div id="records" className="scroll-mt-24"><SavedRecordsSummary /></div>
        <ClientReportColourCards />
        <div id="exports" className="scroll-mt-24"><ProgressNoteCollectionExport /></div>

        <div className="grid gap-4 lg:grid-cols-3">
          {periods.map((period) => {
            const report = getRosterReportSummary(savedRosterShifts, period, today);
            const reportLines = [
              `Period: ${report.label}`,
              `Date range: ${report.dateRange}`,
              `Total shifts: ${report.totalShifts}`,
              `Notes outstanding: ${report.notesOutstanding}`,
              `Completed: ${report.completed}`,
              `Cancelled/no-show: ${report.cancelledOrNoShow}`,
              "Comparative analysis: see live admin chart for incident reports, community access, and irregular support progress."
            ];
            return (
              <Card key={period}>
                <p className="text-sm font-semibold uppercase tracking-wide text-sea">{report.label}</p>
                <h2 className="mt-2 text-2xl font-bold text-ink">{report.totalShifts} shifts</h2>
                <p className="mt-1 text-sm text-slate-600">{report.dateRange}</p>
                <div className="mt-4 grid gap-2 text-sm text-slate-700">
                  <span>Notes outstanding: <strong>{report.notesOutstanding}</strong></span>
                  <span>Completed: <strong>{report.completed}</strong></span>
                  <span>Cancelled/no-show: <strong>{report.cancelledOrNoShow}</strong></span>
                </div>
                <div className="mt-4">
                  <PdfDownloadButton filename={`empowernotes-${period}-status-report.html`} title={`EmpowerNotes ${report.label}`} lines={reportLines} />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ReportCard icon={ClipboardCheck} title="Documentation Status" value={savedProgressNotes.length} detail="Saved progress-note records" tone="amber" />
          <ReportCard icon={ShieldCheck} title="Incident Oversight" value={incidentsAwaitingReview.length} detail="Incidents awaiting review" tone="red" />
          <ReportCard icon={FileWarning} title="Evidence Gaps" value={unverifiedDocuments.length} detail="Documents awaiting manager verification" tone="blue" />
        </div>
      </Section>
    </AdminGate>
  );
}

function ReportJump({ href, icon: Icon, label, value, active }: { href: string; icon: LucideIcon; label: string; value: number; active: boolean }) {
  return <a href={href} aria-current={active ? "location" : undefined} className={`group inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus:outline focus:outline-2 focus:outline-teal-700 ${active ? "border-sea bg-sea text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-900"}`}><Icon size={17} className={active ? "text-teal-100" : "text-teal-700"} aria-hidden="true" /><span>{label}</span><span className={`rounded-md px-2 py-0.5 text-xs font-bold ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-white"}`}>{value}</span></a>;
}

function CommandMetric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string | number; tone: "red" | "amber" | "sky" | "teal" }) {
  const tones = { red: "text-red-300", amber: "text-amber-300", sky: "text-sky-300", teal: "text-teal-300" };
  return <div className="bg-slate-950/85 p-4 transition hover:bg-slate-900"><Icon size={18} className={tones[tone]} aria-hidden="true" /><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-white">{value}</p></div>;
}

function ReportCard({ icon: Icon, title, value, detail, tone }: { icon: LucideIcon; title: string; value: number; detail: string; tone: "amber" | "red" | "blue" }) {
  const tones = {
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    blue: "bg-sky-50 text-sky-800"
  };

  return (
    <Card className="group transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lift">
      <span className={`grid h-11 w-11 place-items-center rounded-md ${tones[tone]}`}>
        <Icon size={20} className="transition-transform group-hover:scale-110" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </Card>
  );
}
