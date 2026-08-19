"use client";

import { FileText, MapPin, UserRound } from "lucide-react";
import { RosterStatusBadge } from "@/components/roster/RosterStatusBadge";
import { PrivateClientPhoto } from "@/components/participants/PrivateClientPhoto";
import { getRosterCoverageColour, getShiftStaffLabel, type RosterShift } from "@/lib/roster";
import { cn } from "@/lib/utils";

export function RosterShiftCard({ shift, onOpen }: { shift: RosterShift; onOpen: (shift: RosterShift) => void }) {
  const colour = getRosterCoverageColour(shift);

  return (
    <button
      type="button"
      onClick={() => onOpen(shift)}
      className={cn(
        "w-full rounded-md border-l-4 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift focus:outline focus:outline-2 focus:outline-teal-700",
        colour.border,
        colour.softBg
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <PrivateClientPhoto path={shift.participantPhotoPath} alt={`${shift.participantName} profile`} fallback={getInitials(shift.participantName)} />
          <div>
          <p className="text-sm font-semibold text-slate-500">{shift.startTime} - {shift.endTime}</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">{shift.participantName}</h3>
          <p className="mt-1 text-sm font-medium text-slate-700">{shift.supportType}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RosterStatusBadge status={shift.status} />
          <span className={cn("inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-bold", colour.text)}>
            <span className={cn("h-2 w-2 rounded-full", colour.dot)} aria-hidden="true" />
            {colour.label}
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        <span className="inline-flex items-start gap-2"><UserRound size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><span><strong className="font-semibold text-slate-700">{getShiftStaffLabel(shift)}</strong>{shift.staffingRatio ? ` (${shift.staffingRatio})` : ""}</span></span>
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

function getInitials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}
