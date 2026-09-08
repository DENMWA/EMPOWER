"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { AvailabilityKind } from "@/lib/roster-intelligence";
import type { WeeklyGridEntry } from "@/lib/roster-intelligence-cloud";
import { cn } from "@/lib/utils";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type DayState = { state: "not_set" | AvailabilityKind; startTime: string; endTime: string };

const stateOptions: Array<{ value: DayState["state"]; label: string }> = [
  { value: "not_set", label: "Not set" },
  { value: "available", label: "Available" },
  { value: "preferred", label: "Preferred" },
  { value: "unavailable", label: "Unavailable" }
];

export function WeeklyAvailabilityGrid({
  initialEntries,
  onSave,
  saveLabel = "Save week"
}: {
  initialEntries: WeeklyGridEntry[];
  onSave: (grid: WeeklyGridEntry[]) => Promise<{ saved: boolean; error: string }>;
  saveLabel?: string;
}) {
  const [days, setDays] = useState<DayState[]>(() => buildInitialDays(initialEntries));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { setDays(buildInitialDays(initialEntries)); }, [initialEntries]);

  function updateDay(index: number, patch: Partial<DayState>) {
    setDays((current) => current.map((day, dayIndex) => (dayIndex === index ? { ...day, ...patch } : day)));
  }

  async function handleSave() {
    const invalidDay = days.find((day) => day.state !== "not_set" && day.endTime <= day.startTime);
    if (invalidDay) { setMessage("End time must be later than start time for every day you've set."); return; }
    setSaving(true);
    setMessage("");
    const grid: WeeklyGridEntry[] = days
      .map((day, weekday) => ({ day, weekday }))
      .filter(({ day }) => day.state !== "not_set")
      .map(({ day, weekday }) => ({ weekday, startTime: day.startTime, endTime: day.endTime, kind: day.state as AvailabilityKind }));
    const result = await onSave(grid);
    setSaving(false);
    setMessage(result.saved ? "Week saved." : result.error || "Could not save this week.");
  }

  return (
    <div>
      <div className="space-y-2">
        {days.map((day, index) => (
          <div key={weekdays[index]} className="grid grid-cols-1 items-center gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[100px_1fr_auto_auto]">
            <p className="font-semibold text-ink">{weekdays[index]}</p>
            <div className="flex flex-wrap gap-1.5">
              {stateOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateDay(index, { state: option.value })}
                  className={cn(
                    "min-h-9 rounded-md px-3 text-xs font-semibold",
                    day.state === option.value
                      ? option.value === "unavailable" ? "bg-red-600 text-white" : option.value === "not_set" ? "bg-slate-600 text-white" : "bg-sea text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {day.state !== "not_set" ? (
              <>
                <input type="time" value={day.startTime} onChange={(event) => updateDay(index, { startTime: event.target.value })} className="min-h-9 rounded-md border border-slate-300 px-2 text-sm" aria-label={`${weekdays[index]} start time`} />
                <input type="time" value={day.endTime} onChange={(event) => updateDay(index, { endTime: event.target.value })} className="min-h-9 rounded-md border border-slate-300 px-2 text-sm" aria-label={`${weekdays[index]} end time`} />
              </>
            ) : <span className="hidden sm:col-span-2 sm:block" />}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving} onClick={handleSave} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white disabled:opacity-60">
          <Check size={17} />{saving ? "Saving..." : saveLabel}
        </button>
        {message ? <p className="text-sm font-semibold text-slate-600" role="status">{message}</p> : null}
      </div>
    </div>
  );
}

function buildInitialDays(entries: WeeklyGridEntry[]): DayState[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const match = entries.find((entry) => entry.weekday === weekday);
    return match
      ? { state: match.kind, startTime: match.startTime, endTime: match.endTime }
      : { state: "not_set" as const, startTime: "09:00", endTime: "17:00" };
  });
}
