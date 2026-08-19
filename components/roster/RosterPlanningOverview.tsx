"use client";

import { CalendarDays } from "lucide-react";
import { getRosterCoverageColour, getRosterPlanningRange, getShiftDurationHours, type RosterPlanningView, type RosterShift } from "@/lib/roster";
import { cn } from "@/lib/utils";

type PlanningBucket = {
  key: string;
  label: string;
  range: string;
  shifts: RosterShift[];
};

export function RosterPlanningOverview({
  selectedDate,
  view,
  shifts,
  onSelectDate
}: {
  selectedDate: string;
  view: Extract<RosterPlanningView, "month" | "quarter" | "year">;
  shifts: RosterShift[];
  onSelectDate: (date: string) => void;
}) {
  const buckets = getPlanningBuckets(selectedDate, view, shifts);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {buckets.map((bucket) => {
        const summary = getBucketSummary(bucket.shifts);
        return (
          <button
            key={bucket.key}
            type="button"
            onClick={() => onSelectDate(bucket.key)}
            className={cn(
              "rounded-md border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-lift focus:outline focus:outline-2 focus:outline-teal-700",
              summary.vacant ? "border-red-200" : "border-slate-200"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">{bucket.label}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{bucket.range}</p>
              </div>
              <span className={cn("grid h-10 w-10 place-items-center rounded-md", summary.vacant ? "bg-red-50 text-red-700" : "bg-sky-50 text-sky-800")}>
                <CalendarDays size={19} aria-hidden="true" />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metric label="Shifts" value={summary.total} />
              <Metric label="Hours" value={summary.hours.toFixed(1)} />
              <Metric label="Assigned" value={summary.assigned} tone="text-sky-800" />
              <Metric label="Vacant" value={summary.vacant} tone={summary.vacant ? "text-red-700" : "text-slate-500"} />
            </div>

            {summary.cancelled ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{summary.cancelled} cancelled or no-show shift{summary.cancelled === 1 ? "" : "s"}</p> : null}
          </button>
        );
      })}
    </div>
  );
}

function Metric({ label, value, tone = "text-ink" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", tone)}>{value}</p>
    </div>
  );
}

function getPlanningBuckets(selectedDate: string, view: "month" | "quarter" | "year", shifts: RosterShift[]) {
  const range = getRosterPlanningRange(selectedDate, view);
  if (view === "month") return getWeekBuckets(range.start, range.end, shifts);
  return getMonthBuckets(range.start, range.end, shifts);
}

function getWeekBuckets(start: Date, end: Date, shifts: RosterShift[]) {
  const buckets: PlanningBucket[] = [];
  const cursor = new Date(start);
  let index = 1;
  while (cursor <= end) {
    const bucketStart = new Date(cursor);
    const bucketEnd = new Date(cursor);
    bucketEnd.setDate(bucketEnd.getDate() + 6);
    if (bucketEnd > end) bucketEnd.setTime(end.getTime());
    buckets.push(createBucket(`Week ${index}`, bucketStart, bucketEnd, shifts));
    cursor.setDate(cursor.getDate() + 7);
    index += 1;
  }
  return buckets;
}

function getMonthBuckets(start: Date, end: Date, shifts: RosterShift[]) {
  const buckets: PlanningBucket[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const bucketStart = new Date(cursor);
    const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    if (bucketEnd > end) bucketEnd.setTime(end.getTime());
    buckets.push(createBucket(bucketStart.toLocaleDateString("en-AU", { month: "long" }), bucketStart, bucketEnd, shifts));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

function createBucket(label: string, start: Date, end: Date, shifts: RosterShift[]) {
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  return {
    key: startKey,
    label,
    range: `${start.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`,
    shifts: shifts.filter((shift) => shift.shiftDate >= startKey && shift.shiftDate <= endKey)
  };
}

function getBucketSummary(shifts: RosterShift[]) {
  return {
    total: shifts.length,
    hours: shifts.filter((shift) => !["Cancelled", "No Show"].includes(shift.status)).reduce((total, shift) => total + getShiftDurationHours(shift.startTime, shift.endTime), 0),
    assigned: shifts.filter((shift) => getRosterCoverageColour(shift).label === "Assigned").length,
    vacant: shifts.filter((shift) => ["Vacant / cancelled", "Unassigned"].includes(getRosterCoverageColour(shift).label)).length,
    cancelled: shifts.filter((shift) => shift.status === "Cancelled" || shift.status === "No Show").length
  };
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
