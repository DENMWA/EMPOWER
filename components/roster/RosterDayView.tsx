"use client";

import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui";
import { RosterShiftCard } from "@/components/roster/RosterShiftCard";
import type { RosterShift } from "@/lib/roster";

export function RosterDayView({ date, shifts, onOpenShift }: { date: string; shifts: RosterShift[]; onOpenShift: (shift: RosterShift) => void }) {
  const sorted = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (sorted.length === 0) {
    return (
      <Card className="grid min-h-64 place-items-center text-center">
        <div>
          <CalendarDays className="mx-auto text-slate-400" size={34} aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold text-ink">No shifts rostered</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Create a shift for this date to begin tracking staff allocation and documentation follow-up.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
      <Card className="h-fit">
        <p className="text-sm font-semibold uppercase tracking-wide text-sea">Day view</p>
        <p className="mt-2 text-2xl font-bold text-ink">{new Date(`${date}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</p>
        <p className="mt-1 text-sm text-slate-600">{sorted.length} rostered shift{sorted.length === 1 ? "" : "s"}</p>
      </Card>
      <div className="space-y-4">
        {sorted.map((shift) => <RosterShiftCard key={shift.id} shift={shift} onOpen={onOpenShift} />)}
      </div>
    </div>
  );
}
