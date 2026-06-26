"use client";

import { CheckCircle2, FileCheck2, MapPin, X } from "lucide-react";
import { RosterStatusBadge } from "@/components/roster/RosterStatusBadge";
import { getEmployeeColourScheme, type RosterShift } from "@/lib/roster";
import { cn } from "@/lib/utils";

export function RosterShiftModal({
  shift,
  onClose,
  onComplete,
  onNoteCompleted
}: {
  shift: RosterShift | null;
  onClose: () => void;
  onComplete: (shiftId: string) => void;
  onNoteCompleted: (shiftId: string) => void;
}) {
  if (!shift) return null;

  const colour = getEmployeeColourScheme(shift.workerId);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="roster-shift-title">
      <div className="w-full max-w-2xl overflow-hidden rounded-md bg-white shadow-lift">
        <div className={cn("h-2", colour.bg)} />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <RosterStatusBadge status={shift.status} />
              <h2 id="roster-shift-title" className="mt-3 text-2xl font-bold text-ink">{shift.participantName}</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">{shift.supportType}</p>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Close shift details">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className={cn("rounded-md border p-4", colour.softBg, colour.border)}>
              <p className="text-sm font-semibold text-slate-600">Worker</p>
              <p className={cn("mt-1 text-lg font-semibold", colour.text)}>{shift.workerName}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-600">Time</p>
              <p className="mt-1 text-lg font-semibold text-ink">{shift.shiftDate} · {shift.startTime} - {shift.endTime}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
            <p className="inline-flex items-center gap-2"><MapPin size={17} aria-hidden="true" />{shift.location}</p>
            <div className="rounded-md bg-slate-50 p-4">
              <p className="font-semibold text-ink">Shift instructions</p>
              <p className="mt-1">{shift.shiftInstructions}</p>
            </div>
            <div className="rounded-md bg-amber-50 p-4 text-amber-950">
              <p className="font-semibold">Documentation tracking</p>
              <p className="mt-1">{shift.noteRequired ? (shift.noteCompleted ? "Progress note has been completed for this shift." : "Progress note is required after this shift.") : "Progress note is not required for this shift."}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => onComplete(shift.id)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-ink hover:bg-slate-50">
              <CheckCircle2 size={18} aria-hidden="true" />Mark completed
            </button>
            <button type="button" onClick={() => onNoteCompleted(shift.id)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">
              <FileCheck2 size={18} aria-hidden="true" />Mark note done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
