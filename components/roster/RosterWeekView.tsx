"use client";

import { RosterStatusBadge } from "@/components/roster/RosterStatusBadge";
import { getRosterCoverageColour, getRosterFortnightDays, getRosterWeekDays, getShiftAssignedWorkers, getShiftDurationHours, getShiftStaffLabel, type RosterShift } from "@/lib/roster";
import { cn } from "@/lib/utils";

type RosterRow = {
  id: string;
  name: string;
  shifts: RosterShift[];
};

export function RosterWeekView({
  selectedDate,
  span = "week",
  shifts,
  workers,
  onOpenShift,
  onCreateShift
}: {
  selectedDate: string;
  span?: "week" | "fortnight";
  shifts: RosterShift[];
  workers: Array<{ id: string; name: string }>;
  onOpenShift: (shift: RosterShift) => void;
  onCreateShift: (input: { shiftDate: string; workerId?: string }) => void;
}) {
  const days = span === "fortnight" ? getRosterFortnightDays(selectedDate) : getRosterWeekDays(selectedDate);
  const rows = getRosterRows(shifts, workers);
  const dayColumns = span === "fortnight" ? "grid-cols-[180px_repeat(14,minmax(120px,1fr))_80px_80px_90px]" : "grid-cols-[180px_repeat(7,minmax(120px,1fr))_80px_80px_90px]";
  const dayTotals = days.map((day) => ({
    dateKey: day.dateKey,
    hours: getShiftHours(shifts.filter((shift) => shift.shiftDate === day.dateKey))
  }));
  const periodHours = getShiftHours(shifts);

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
      <div className={cn(span === "fortnight" ? "min-w-[1960px]" : "min-w-[1120px]")}>
        <div className={cn("grid border-b border-slate-200 bg-sky-900 text-white", dayColumns)}>
          <div className="px-3 py-3 text-sm font-bold">Staff / coverage</div>
          {days.map((day) => (
            <div key={day.dateKey} className="border-l border-sky-700 px-3 py-3 text-center">
              <p className="text-sm font-bold">{day.label}</p>
              <p className="text-xs text-sky-100">{day.shortDate}</p>
            </div>
          ))}
          <div className="border-l border-sky-700 px-3 py-3 text-center text-sm font-bold">Shifts</div>
          <div className="border-l border-sky-700 px-3 py-3 text-center text-sm font-bold">Hours</div>
          <div className="border-l border-sky-700 px-3 py-3 text-center text-sm font-bold">Vacant</div>
        </div>

        {rows.length ? rows.map((row, rowIndex) => {
          const rowActiveShifts = row.shifts.filter((shift) => shift.status !== "Cancelled" && shift.status !== "No Show").length;
          const rowHours = getShiftHours(row.shifts);
          const rowVacantShifts = row.shifts.filter((shift) => {
            const colour = getRosterCoverageColour(shift);
            return colour.label === "Vacant / cancelled" || colour.label === "Unassigned";
          }).length;

          return (
            <div key={row.id} className={cn("grid border-b border-slate-100", dayColumns, rowIndex % 2 ? "bg-slate-50/60" : "bg-white")}>
              <div className="sticky left-0 z-10 border-r border-slate-200 bg-inherit px-3 py-3">
                <p className="text-sm font-bold text-ink">{row.name}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{row.id === "unassigned" ? "Needs allocation" : "Rostered worker"}</p>
              </div>

              {days.map((day) => {
                const dayShifts = row.shifts.filter((shift) => shift.shiftDate === day.dateKey).sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <div key={`${row.id}-${day.dateKey}`} className="min-h-28 border-r border-slate-100 px-2 py-2">
                    {dayShifts.length ? (
                      <div className="space-y-1.5">
                        {dayShifts.map((shift) => {
                          const colour = getRosterCoverageColour(shift);
                          return (
                            <button
                              key={`${row.id}-${shift.id}`}
                              type="button"
                              onClick={() => onOpenShift(shift)}
                              className={cn("w-full rounded-md border-l-4 px-2.5 py-2 text-left text-xs shadow-sm transition hover:shadow-md focus:outline focus:outline-2 focus:outline-teal-700", colour.border, colour.softBg)}
                              title={`${shift.startTime}-${shift.endTime} ${shift.participantName} - ${getShiftStaffLabel(shift)}`}
                            >
                              <span className={cn("flex items-center gap-1.5 font-bold", colour.text)}>
                                <span className={cn("h-2 w-2 shrink-0 rounded-full", colour.dot)} aria-hidden="true" />
                                {shift.startTime}-{shift.endTime}
                              </span>
                              <span className="mt-1 block truncate font-semibold text-slate-800">{shift.participantName}</span>
                              <span className="mt-0.5 block truncate text-slate-600">{shift.supportType}</span>
                              <span className="mt-0.5 block text-slate-600">{formatHours(getShiftDurationHours(shift.startTime, shift.endTime))}</span>
                              <span className="mt-1 inline-flex"><RosterStatusBadge status={shift.status} /></span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onCreateShift({ shiftDate: day.dateKey, workerId: row.id === "unassigned" ? undefined : row.id })}
                      className="mt-1.5 w-full rounded-md border border-dashed border-slate-300 bg-white/80 px-2 py-2 text-left text-xs font-bold text-slate-500 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900 focus:outline focus:outline-2 focus:outline-teal-700"
                    >
                      + Add shift
                    </button>
                  </div>
                );
              })}

              <div className="grid place-items-center border-r border-slate-100 px-2 py-3 text-lg font-bold text-ink">{rowActiveShifts}</div>
              <div className="grid place-items-center border-r border-slate-100 px-2 py-3 text-lg font-bold text-teal-800">{formatHours(rowHours)}</div>
              <div className={cn("grid place-items-center px-2 py-3 text-lg font-bold", rowVacantShifts ? "text-red-700" : "text-slate-500")}>{rowVacantShifts}</div>
            </div>
          );
        }) : null}

        {rows.length ? (
          <div className={cn("grid border-t-2 border-sky-900 bg-slate-100", dayColumns)}>
            <div className="sticky left-0 z-10 border-r border-slate-300 bg-slate-100 px-3 py-3">
              <p className="text-sm font-bold text-ink">Total hours</p>
              <p className="mt-1 text-xs font-medium text-slate-600">{span === "fortnight" ? "Fortnight roster total" : "Weekly roster total"}</p>
            </div>
            {dayTotals.map((day) => (
              <div key={`total-${day.dateKey}`} className="grid place-items-center border-r border-slate-300 px-2 py-3 text-sm font-bold text-teal-900">
                {formatHours(day.hours)}
              </div>
            ))}
            <div className="grid place-items-center border-r border-slate-300 px-2 py-3 text-sm font-bold text-slate-700">{shifts.length}</div>
            <div className="grid place-items-center border-r border-slate-300 px-2 py-3 text-lg font-black text-teal-900">{formatHours(periodHours)}</div>
            <div className="grid place-items-center px-2 py-3 text-sm font-bold text-slate-700">-</div>
          </div>
        ) : (
          <div className="grid min-h-40 place-items-center text-center">
            <div>
              <h2 className="text-xl font-semibold text-ink">No roster shifts this week</h2>
              <p className="mt-2 text-sm text-slate-600">Add roster shifts to build the weekly calendar.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getRosterRows(shifts: RosterShift[], workers: Array<{ id: string; name: string }>) {
  const rows = new Map<string, RosterRow>();

  rows.set("unassigned", { id: "unassigned", name: "Unassigned / vacant", shifts: [] });

  workers.forEach((worker) => {
    if (worker.id) rows.set(worker.id, { id: worker.id, name: worker.name, shifts: [] });
  });

  shifts.forEach((shift) => {
    const workers = getShiftAssignedWorkers(shift).filter((worker) => worker.id && worker.name && worker.name !== "Unassigned" && worker.name !== "Vacant");
    if (!workers.length) {
      const existing = rows.get("unassigned") || { id: "unassigned", name: "Unassigned / vacant", shifts: [] };
      existing.shifts.push(shift);
      rows.set(existing.id, existing);
      return;
    }

    workers.forEach((worker) => {
      const existing = rows.get(worker.id) || { id: worker.id, name: worker.name, shifts: [] };
      existing.shifts.push(shift);
      rows.set(worker.id, existing);
    });
  });

  return Array.from(rows.values()).sort((a, b) => {
    if (a.id === "unassigned") return -1;
    if (b.id === "unassigned") return 1;
    return a.name.localeCompare(b.name);
  });
}

function getShiftHours(shifts: RosterShift[]) {
  return Math.round(shifts
    .filter((shift) => shift.status !== "Cancelled" && shift.status !== "No Show")
    .reduce((total, shift) => total + getShiftDurationHours(shift.startTime, shift.endTime), 0) * 100) / 100;
}

function formatHours(hours: number) {
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`;
}
