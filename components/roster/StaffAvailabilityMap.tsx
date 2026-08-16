"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CalendarCheck2, Grid3X3 } from "lucide-react";
import { Card } from "@/components/ui";
import type { StaffAvailability } from "@/lib/roster-intelligence";
import { getWeekStart, getShiftAssignedWorkers, type RosterShift } from "@/lib/roster";
import type { StaffRecord } from "@/lib/staff-records";
import { cn } from "@/lib/utils";

type MapMode = "staff" | "coverage" | "gaps";

const stateStyles = {
  preferred: "border-emerald-300 bg-emerald-50 text-emerald-950",
  available: "border-teal-300 bg-teal-50 text-teal-950",
  unavailable: "border-red-300 bg-red-50 text-red-950",
  rostered: "border-sky-400 bg-sky-100 text-sky-950",
  missing: "border-slate-200 bg-slate-50 text-slate-600"
};

export function StaffAvailabilityMap({ staff, availability, shifts, selectedDate }: { staff: StaffRecord[]; availability: StaffAvailability[]; shifts: RosterShift[]; selectedDate: string }) {
  const [mode, setMode] = useState<MapMode>("staff");
  const days = useMemo(() => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      return {
        dateKey: localDateKey(date),
        weekday: date.getDay(),
        label: date.toLocaleDateString("en-AU", { weekday: "short" }),
        dateLabel: date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
      };
    });
  }, [selectedDate]);

  const coverage = days.map((day) => {
    const eligible = staff.filter((worker) => availability.some((item) => item.staffInviteId === worker.id && matchesDay(item, day.dateKey, day.weekday) && item.kind !== "unavailable"));
    const rostered = new Set(shifts.filter((shift) => shift.shiftDate === day.dateKey && !["Cancelled", "No Show"].includes(shift.status)).flatMap(getShiftAssignedWorkers).map((worker) => worker.id));
    const openShifts = shifts.filter((shift) => shift.shiftDate === day.dateKey && !["Cancelled", "No Show", "Completed", "Note Completed"].includes(shift.status) && getShiftAssignedWorkers(shift).every((worker) => !worker.id));
    return { ...day, available: eligible.length, rostered: rostered.size, openShifts: openShifts.length };
  });

  return (
    <Card className="xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Weekly coverage map</p>
          <h2 className="mt-1 text-xl font-bold text-ink">Availability at a glance</h2>
        </div>
        <div className="grid grid-cols-3 rounded-md border border-slate-300 bg-white p-1" aria-label="Availability map view">
          <ModeButton active={mode === "staff"} onClick={() => setMode("staff")} icon={<Grid3X3 size={16} />} label="Staff" />
          <ModeButton active={mode === "coverage"} onClick={() => setMode("coverage")} icon={<CalendarCheck2 size={16} />} label="Coverage" />
          <ModeButton active={mode === "gaps"} onClick={() => setMode("gaps")} icon={<AlertTriangle size={16} />} label="Gaps" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-700" aria-label="Availability legend">
        <Legend className={stateStyles.preferred} label="Preferred" />
        <Legend className={stateStyles.available} label="Available" />
        <Legend className={stateStyles.rostered} label="Rostered" />
        <Legend className={stateStyles.unavailable} label="Unavailable" />
        <Legend className={stateStyles.missing} label="Not submitted" />
      </div>

      {mode === "staff" ? (
        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[980px]" role="table" aria-label="Staff weekly availability">
            <div className="grid grid-cols-[180px_repeat(7,minmax(110px,1fr))] gap-2" role="row">
              <div className="px-2 py-3 text-xs font-bold uppercase text-slate-500" role="columnheader">Staff</div>
              {days.map((day) => <div key={day.dateKey} className="px-2 py-2 text-center" role="columnheader"><p className="font-bold text-ink">{day.label}</p><p className="text-xs text-slate-500">{day.dateLabel}</p></div>)}
            </div>
            <div className="space-y-2">
              {staff.map((worker) => (
                <div key={worker.id} className="grid grid-cols-[180px_repeat(7,minmax(110px,1fr))] gap-2" role="row">
                  <div className="flex min-h-[74px] items-center rounded-md border border-slate-200 bg-white px-3" role="rowheader"><span className="font-semibold text-ink">{worker.name}</span></div>
                  {days.map((day) => <AvailabilityCell key={day.dateKey} worker={worker} day={day} records={availability} shifts={shifts} />)}
                </div>
              ))}
              {!staff.length ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">Add staff to build the availability map.</p> : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {coverage.map((day) => {
            const gap = day.available === 0 || day.openShifts > 0;
            return <div key={day.dateKey} className={cn("min-h-[150px] rounded-md border p-4", mode === "gaps" && gap ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50")}><p className="font-bold text-ink">{day.label}</p><p className="text-xs text-slate-500">{day.dateLabel}</p><p className="mt-4 text-3xl font-bold text-teal-800">{day.available}</p><p className="text-xs font-semibold text-slate-600">staff available</p><p className="mt-2 text-sm text-slate-700">{day.rostered} rostered · {day.openShifts} open</p>{mode === "gaps" ? <p className={cn("mt-3 text-xs font-bold", gap ? "text-amber-900" : "text-emerald-800")}>{gap ? "Coverage review needed" : "Coverage recorded"}</p> : null}</div>;
          })}
        </div>
      )}
    </Card>
  );
}

function AvailabilityCell({ worker, day, records, shifts }: { worker: StaffRecord; day: {dateKey:string;weekday:number}; records: StaffAvailability[]; shifts: RosterShift[] }) {
  const windows = records.filter((item) => item.staffInviteId === worker.id && matchesDay(item, day.dateKey, day.weekday));
  const rostered = shifts.filter((shift) => shift.shiftDate === day.dateKey && !["Cancelled", "No Show"].includes(shift.status) && getShiftAssignedWorkers(shift).some((assigned) => assigned.id === worker.id));
  const strongest = windows.find((item) => item.kind === "unavailable") || windows.find((item) => item.kind === "preferred") || windows[0];
  const state: keyof typeof stateStyles = rostered.length ? "rostered" : strongest ? strongest.kind : "missing";
  const label = state === "missing" ? "Not submitted" : state === "rostered" ? "Rostered" : state[0].toUpperCase() + state.slice(1);
  const detail = rostered.length ? rostered.map((shift) => `${shift.startTime}-${shift.endTime}`).join(", ") : windows.length ? windows.map((item) => `${item.startTime}-${item.endTime}`).join(", ") : "No hours recorded";
  return <div className={cn("flex min-h-[74px] flex-col justify-center rounded-md border px-2 py-2", stateStyles[state])} role="cell" aria-label={`${worker.name}: ${label}, ${detail}`}><p className="text-xs font-bold">{label}</p><p className="mt-1 text-xs leading-4">{detail}</p>{rostered.length && windows.some((item) => item.kind === "unavailable") ? <p className="mt-1 text-[11px] font-bold text-red-800">Conflict</p> : null}</div>;
}

function ModeButton({active,onClick,icon,label}:{active:boolean;onClick:()=>void;icon:ReactNode;label:string}) { return <button type="button" aria-pressed={active} onClick={onClick} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold", active ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-50")}>{icon}{label}</button>; }
function Legend({className,label}:{className:string;label:string}) { return <span className="inline-flex items-center gap-2"><span className={cn("h-4 w-4 rounded-sm border",className)} />{label}</span>; }
function matchesDay(item:StaffAvailability,dateKey:string,weekday:number){return item.specificDate?item.specificDate===dateKey:item.weekday===weekday;}
function localDateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
