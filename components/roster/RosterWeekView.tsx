"use client";

import { RosterStatusBadge } from "@/components/roster/RosterStatusBadge";
import { getRosterCoverageColour, getRosterWeekDays, getShiftStaffLabel, type RosterShift } from "@/lib/roster";
import { cn } from "@/lib/utils";

export function RosterWeekView({ selectedDate, shifts, onOpenShift }: { selectedDate: string; shifts: RosterShift[]; onOpenShift: (shift: RosterShift) => void }) {
  const days = getRosterWeekDays(selectedDate);

  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const dayShifts = shifts.filter((shift) => shift.shiftDate === day.dateKey).sort((a, b) => a.startTime.localeCompare(b.startTime));
        return (
          <section key={day.dateKey} className="min-h-52 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <div className="border-b border-slate-100 pb-3">
              <p className="text-sm font-semibold text-ink">{day.label}</p>
              <p className="text-xs text-slate-500">{day.shortDate}</p>
            </div>
            <div className="mt-3 space-y-2">
              {dayShifts.length === 0 ? <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">No shifts</p> : null}
              {dayShifts.map((shift) => {
                const colour = getRosterCoverageColour(shift);
                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => onOpenShift(shift)}
                    className={cn("w-full rounded-md border-l-4 p-3 text-left transition hover:shadow-md focus:outline focus:outline-2 focus:outline-teal-700", colour.softBg, colour.border)}
                  >
                    <p className="text-xs font-semibold text-slate-600">{shift.startTime} - {shift.endTime}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", colour.dot)} aria-hidden="true" />
                      <p className={cn("text-sm font-semibold", colour.text)}>{shift.participantName}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-700">{getShiftStaffLabel(shift)}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{shift.supportType}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <RosterStatusBadge status={shift.status} />
                      <span className={cn("rounded-md bg-white px-2 py-0.5 text-[11px] font-bold", colour.text)}>{colour.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
