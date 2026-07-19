import { AdminGate } from "@/components/admin/AdminGate";
import { ClientReportColourCards } from "@/components/admin/ClientReportColourCards";
import { ProgressNoteCollectionExport } from "@/components/notes/ProgressNoteCollectionExport";
import { PdfDownloadButton } from "@/components/admin/PdfDownloadButton";
import { ReportingInsightsChart } from "@/components/admin/ReportingInsightsChart";
import { SavedRecordsSummary } from "@/components/admin/SavedRecordsSummary";
import { ClipboardCheck, FileWarning, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader, Section, StatusBadge } from "@/components/ui";
import { getRosterReportSummary, rosterShifts, type RosterReportPeriod } from "@/lib/roster";
import { documents, progressNotes } from "@/lib/sample-data";

const periods: RosterReportPeriod[] = ["weekly", "fortnightly", "monthly"];

export default function AdminReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const weakNotes = progressNotes.filter((note) => note.score < 80 || note.missingDetails.length > 0);
  const unverifiedDocuments = documents.filter((doc) => !doc.status.includes("verified"));

  return (
    <AdminGate>
      <PageHeader
        eyebrow="Admin reports"
        title="Status reports for documentation, roster, incidents, and evidence"
        description="Admin-only reporting views for weekly, fortnightly, and monthly operational health."
        actions={<StatusBadge label="Admin / owner only" tone="blue" />}
      />
      <Section className="space-y-6">
        <ReportingInsightsChart />
        <SavedRecordsSummary />
        <ClientReportColourCards />
        <ProgressNoteCollectionExport />

        <div className="grid gap-4 lg:grid-cols-3">
          {periods.map((period) => {
            const report = getRosterReportSummary(rosterShifts, period, today);
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
          <ReportCard icon={ClipboardCheck} title="Documentation Status" value={weakNotes.length} detail="Notes with low score or missing details" tone="amber" />
          <ReportCard icon={ShieldCheck} title="Incident Oversight" value={3} detail="Incidents awaiting review" tone="red" />
          <ReportCard icon={FileWarning} title="Evidence Gaps" value={unverifiedDocuments.length} detail="Documents awaiting manager verification" tone="blue" />
        </div>
      </Section>
    </AdminGate>
  );
}

function ReportCard({ icon: Icon, title, value, detail, tone }: { icon: LucideIcon; title: string; value: number; detail: string; tone: "amber" | "red" | "blue" }) {
  const tones = {
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    blue: "bg-sky-50 text-sky-800"
  };

  return (
    <Card>
      <span className={`grid h-11 w-11 place-items-center rounded-md ${tones[tone]}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </Card>
  );
}
