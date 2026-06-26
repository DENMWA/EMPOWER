"use client";

import { RosterStatusBadge } from "@/components/roster/RosterStatusBadge";
import { getEmployeeColourScheme, getRosterWeekDays, type RosterShift } from "@/lib/roster";
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
                const colour = getEmployeeColourScheme(shift.workerId);
                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => onOpenShift(shift)}
                    className={cn("w-full rounded-md border-l-4 p-3 text-left transition hover:shadow-md focus:outline focus:outline-2 focus:outline-teal-700", colour.softBg, colour.border)}
                  >
                    <p className="text-xs font-semibold text-slate-600">{shift.startTime} - {shift.endTime}</p>
                    <p className={cn("mt-1 text-sm font-semibold", colour.text)}>{shift.participantName}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{shift.workerName.split(" ")[0]} - {shift.supportType}</p>
                    <RosterStatusBadge status={shift.status} className="mt-2" />
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
