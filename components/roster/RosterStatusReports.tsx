"use client";

import { useMemo, useState } from "react";
import { BarChart3, LockKeyhole } from "lucide-react";
import { RosterStatusBadge } from "@/components/roster/RosterStatusBadge";
import { Card } from "@/components/ui";
import { getRosterReportSummary, type RosterReportPeriod, type RosterShift } from "@/lib/roster";
import { cn } from "@/lib/utils";

const periods: Array<{ value: RosterReportPeriod; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" }
];

export function RosterStatusReports({ shifts, selectedDate }: { shifts: RosterShift[]; selectedDate: string }) {
  const [period, setPeriod] = useState<RosterReportPeriod>("weekly");
  const report = useMemo(() => getRosterReportSummary(shifts, period, selectedDate), [period, selectedDate, shifts]);

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
    </Card>
  );
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
