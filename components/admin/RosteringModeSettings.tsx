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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sea">Rostering setup</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Roster source</h2>
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
              <span className="mt-1 block text-sm leading-5 text-slate-600">{shortRosterDescription(option.value)}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function shortRosterDescription(mode: RosteringMode) {
  if (mode === "built-in") return "Create and assign shifts here.";
  if (mode === "imported") return "Import shifts from another system.";
  return "Enter shift details only when needed.";
}
