"use client";

import { RosterStatusBadge } from "@/components/roster/RosterStatusBadge";
import { getRosterCoverageColour, getRosterWeekDays, getShiftAssignedWorkers, getShiftStaffLabel, type RosterShift } from "@/lib/roster";
import { cn } from "@/lib/utils";

type RosterRow = {
  id: string;
  name: string;
  shifts: RosterShift[];
};

export function RosterWeekView({ selectedDate, shifts, onOpenShift }: { selectedDate: string; shifts: RosterShift[]; onOpenShift: (shift: RosterShift) => void }) {
  const days = getRosterWeekDays(selectedDate);
  const rows = getRosterRows(shifts);

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="min-w-[1120px]">
        <div className="grid grid-cols-[180px_repeat(7,minmax(120px,1fr))_80px_90px] border-b border-slate-200 bg-sky-900 text-white">
          <div className="px-3 py-3 text-sm font-bold">Staff / coverage</div>
          {days.map((day) => (
            <div key={day.dateKey} className="border-l border-sky-700 px-3 py-3 text-center">
              <p className="text-sm font-bold">{day.label}</p>
              <p className="text-xs text-sky-100">{day.shortDate}</p>
            </div>
          ))}
          <div className="border-l border-sky-700 px-3 py-3 text-center text-sm font-bold">Shifts</div>
          <div className="border-l border-sky-700 px-3 py-3 text-center text-sm font-bold">Vacant</div>
        </div>

        {rows.length ? rows.map((row, rowIndex) => {
          const rowActiveShifts = row.shifts.filter((shift) => shift.status !== "Cancelled" && shift.status !== "No Show").length;
          const rowVacantShifts = row.shifts.filter((shift) => {
            const colour = getRosterCoverageColour(shift);
            return colour.label === "Vacant / cancelled" || colour.label === "Unassigned";
          }).length;

          return (
            <div key={row.id} className={cn("grid grid-cols-[180px_repeat(7,minmax(120px,1fr))_80px_90px] border-b border-slate-100", rowIndex % 2 ? "bg-slate-50/60" : "bg-white")}>
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
                              <span className="mt-1 inline-flex"><RosterStatusBadge status={shift.status} /></span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-md bg-slate-50 px-2 py-2 text-xs font-medium text-slate-400">Available slot</p>
                    )}
                  </div>
                );
              })}

              <div className="grid place-items-center border-r border-slate-100 px-2 py-3 text-lg font-bold text-ink">{rowActiveShifts}</div>
              <div className={cn("grid place-items-center px-2 py-3 text-lg font-bold", rowVacantShifts ? "text-red-700" : "text-slate-500")}>{rowVacantShifts}</div>
            </div>
          );
        }) : (
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

function getRosterRows(shifts: RosterShift[]) {
  const rows = new Map<string, RosterRow>();

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
