"use client";

import { getEmployeeColourScheme, getShiftAssignedWorkers, type RosterShift } from "@/lib/roster";
import { cn } from "@/lib/utils";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function RosterMonthView({
  selectedDate,
  shifts,
  onOpenShift,
  onSelectDate
}: {
  selectedDate: string;
  shifts: RosterShift[];
  onOpenShift: (shift: RosterShift) => void;
  onSelectDate: (date: string) => void;
}) {
  const selected = new Date(`${selectedDate}T00:00:00`);
  const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(selected.getFullYear(), selected.getMonth(), 1 - mondayOffset);
  const today = toDateKey(new Date());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      currentMonth: date.getMonth() === selected.getMonth()
    };
  });

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="min-w-[840px]">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {weekdayLabels.map((label) => (
          <div key={label} className="px-2 py-3 text-center text-xs font-bold uppercase text-slate-600">{label}</div>
        ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayShifts = shifts
              .filter((shift) => shift.shiftDate === day.key)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <section
                key={day.key}
                className={cn(
                  "min-h-40 border-b border-r border-slate-100 p-2",
                  !day.currentMonth && "bg-slate-50/70 text-slate-400",
                  day.key === selectedDate && "bg-teal-50/50"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectDate(day.key)}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-md text-sm font-semibold hover:bg-slate-100",
                    day.key === today && "bg-sea text-white hover:bg-teal-800"
                  )}
                  aria-label={`Open day view for ${day.date.toLocaleDateString("en-AU")}`}
                >
                  {day.date.getDate()}
                </button>
                <div className="mt-2 space-y-1">
                  {dayShifts.slice(0, 3).map((shift) => {
                    const colour = getEmployeeColourScheme(shift.workerId);
                    return (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => onOpenShift(shift)}
                        className={cn("block w-full truncate rounded border-l-4 px-2 py-1 text-left text-xs font-semibold", colour.softBg, colour.border, colour.text)}
                        title={`${shift.startTime} ${shift.participantName} - ${getShiftAssignedWorkers(shift).map((worker) => worker.name).join(", ")}`}
                      >
                        {shift.startTime} {shift.participantName}
                      </button>
                    );
                  })}
                  {dayShifts.length > 3 ? (
                    <button type="button" onClick={() => onSelectDate(day.key)} className="text-xs font-semibold text-teal-800">
                      +{dayShifts.length - 3} more
                    </button>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
