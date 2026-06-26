"use client";

import { FileText, MapPin, UserRound } from "lucide-react";
import { RosterStatusBadge } from "@/components/roster/RosterStatusBadge";
import { getEmployeeColourScheme, type RosterShift } from "@/lib/roster";
import { cn } from "@/lib/utils";

export function RosterShiftCard({ shift, onOpen }: { shift: RosterShift; onOpen: (shift: RosterShift) => void }) {
  const colour = getEmployeeColourScheme(shift.workerId);

  return (
    <button
      type="button"
      onClick={() => onOpen(shift)}
      className={cn(
        "w-full rounded-md border-l-4 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift focus:outline focus:outline-2 focus:outline-teal-700",
        colour.border
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{shift.startTime} - {shift.endTime}</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">{shift.participantName}</h3>
          <p className="mt-1 text-sm font-medium text-slate-700">{shift.supportType}</p>
        </div>
        <RosterStatusBadge status={shift.status} />
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2"><UserRound size={16} aria-hidden="true" />{shift.workerName}</span>
        <span className="inline-flex items-center gap-2"><MapPin size={16} aria-hidden="true" />{shift.location}</span>
        <span className="inline-flex items-center gap-2">
          <FileText size={16} aria-hidden="true" />
          {shift.noteRequired ? (shift.noteCompleted ? "Note completed" : "Progress note required") : "No note required"}
        </span>
      </div>
      <div className={cn("mt-4 h-1.5 rounded-full", colour.bg)} aria-hidden="true" />
    </button>
  );
}
