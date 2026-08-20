"use client";

import { useEffect, useState } from "react";
import { CalendarClock, FileUp, Keyboard } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getRosteringMode, rosteringModeOptions, setRosteringMode, type RosteringMode } from "@/lib/rostering-mode";

const icons: Record<RosteringMode, typeof CalendarClock> = {
  "built-in": CalendarClock,
  imported: FileUp,
  manual: Keyboard
};

export function RosteringModeSettings() {
  const [mode, setMode] = useState<RosteringMode>("built-in");

  useEffect(() => {
    setMode(getRosteringMode());
  }, []);

  function chooseMode(nextMode: RosteringMode) {
    setRosteringMode(nextMode);
    setMode(nextMode);
  }

  const selected = rosteringModeOptions.find((option) => option.value === mode) || rosteringModeOptions[0];

  return (
    <Card className="border-sky-100 md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Rostering setup</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Choose how this provider handles rosters</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Keep EmpowerNotes flexible for providers that already use another roster platform while still protecting notes, billing, reports and staff evidence.</p>
        </div>
        <StatusBadge label={selected.label} tone={mode === "built-in" ? "green" : mode === "imported" ? "blue" : "amber"} />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {rosteringModeOptions.map((option) => {
          const Icon = icons[option.value];
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => chooseMode(option.value)}
              className={cn("rounded-md border p-4 text-left transition", active ? "border-teal-600 bg-teal-50 ring-2 ring-teal-100" : "border-slate-200 bg-white hover:border-teal-200")}
            >
              <span className="grid h-10 w-10 place-items-center rounded-md bg-white text-teal-800 shadow-sm">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="mt-3 block font-semibold text-ink">{option.label}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">{option.description}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
