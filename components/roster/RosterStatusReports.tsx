"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download, LockKeyhole, Timer } from "lucide-react";
import { RosterStatusBadge } from "@/components/roster/RosterStatusBadge";
import { Card } from "@/components/ui";
import { getRosterReportSummary, getStaffHoursSummary, type RosterReportPeriod, type RosterShift } from "@/lib/roster";
import { cn } from "@/lib/utils";

const periods: Array<{ value: RosterReportPeriod; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" }
];

export function RosterStatusReports({ shifts, selectedDate }: { shifts: RosterShift[]; selectedDate: string }) {
  const [period, setPeriod] = useState<RosterReportPeriod>("weekly");
  const report = useMemo(() => getRosterReportSummary(shifts, period, selectedDate), [period, selectedDate, shifts]);
  const hours = useMemo(() => getStaffHoursSummary(shifts, period, selectedDate), [period, selectedDate, shifts]);

  return (
    <Card className="space-y-5 border-teal-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-sea">
            <LockKeyhole size={16} aria-hidden="true" />Admin status reports
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">{report.label}</h2>
          <p className="mt-1 text-sm text-slate-600">{report.dateRange}</p>
        </div>
        <div className="grid grid-cols-3 rounded-md border border-slate-300 bg-white p-1" aria-label="Status report period">
          {periods.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
              className={cn("min-h-10 rounded-md px-3 text-sm font-semibold", period === item.value ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-50")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ReportMetric label="Total shifts" value={report.totalShifts} />
        <ReportMetric label="Completed" value={report.completed} />
        <ReportMetric label="Notes required" value={report.noteRequired} />
        <ReportMetric label="Notes outstanding" value={report.notesOutstanding} tone="amber" />
        <ReportMetric label="Cancelled/no-show" value={report.cancelledOrNoShow} tone="red" />
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <BarChart3 size={18} aria-hidden="true" />
          Status breakdown
        </div>
        <div className="flex flex-wrap gap-2">
          {report.statusCounts.map((item) => (
            <div key={item.status} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm shadow-sm">
              <RosterStatusBadge status={item.status} />
              <span className="font-semibold text-ink">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-teal-200 bg-teal-50/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Timer size={18} aria-hidden="true" />Staff hours for pay preparation</div>
            <p className="mt-1 text-sm text-slate-600">Completed roster hours only. Review breaks, allowances and timesheet adjustments before payroll.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right"><p className="text-xs font-semibold uppercase text-slate-500">Total staff hours</p><p className="text-2xl font-bold text-teal-900">{formatHours(hours.totalHours)}</p></div>
            <button type="button" onClick={() => downloadStaffHoursCsv(hours)} disabled={!hours.staff.length} className="grid h-10 w-10 place-items-center rounded-md border border-teal-300 bg-white text-teal-900 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Download staff hours CSV" title="Download staff hours CSV"><Download size={17} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">Staff member</th><th className="px-3 py-2">Completed shifts</th><th className="px-3 py-2">Clients supported</th><th className="px-3 py-2 text-right">Hours worked</th></tr></thead>
            <tbody>
              {hours.staff.map((worker) => (
                <tr key={worker.workerId} className="border-t border-slate-200">
                  <td className="px-3 py-3 font-semibold text-ink">{worker.workerName}</td>
                  <td className="px-3 py-3">{worker.completedShifts}</td>
                  <td className="px-3 py-3 text-slate-600">{worker.participantNames.join(", ")}</td>
                  <td className="px-3 py-3 text-right font-bold text-teal-900">{formatHours(worker.totalHours)}</td>
                </tr>
              ))}
              {!hours.staff.length ? <tr><td colSpan={4} className="px-3 py-5 text-center text-slate-600">No completed staff hours in this period.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function formatHours(value: number) {
  return `${value.toFixed(2)} hrs`;
}

function downloadStaffHoursCsv(hours: ReturnType<typeof getStaffHoursSummary>) {
  const rows = [
    ["Period", hours.dateRange],
    [],
    ["Staff member", "Completed shifts", "Clients supported", "Hours worked"],
    ...hours.staff.map((worker) => [worker.workerName, String(worker.completedShifts), worker.participantNames.join("; "), worker.totalHours.toFixed(2)]),
    [],
    ["Total staff hours", "", "", hours.totalHours.toFixed(2)]
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `empowernotes-staff-hours-${hours.period}-${hours.dateRange.replace(/\s+to\s+/g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ReportMetric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "amber" | "red" }) {
  const tones = {
    slate: "text-ink",
    amber: "text-amber-800",
    red: "text-red-700"
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold", tones[tone])}>{value}</p>
    </div>
  );
}
