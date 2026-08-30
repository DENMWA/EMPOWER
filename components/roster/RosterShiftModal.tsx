"use client";

import { CheckCircle2, FileCheck2, MapPin, Send, UserX, X } from "lucide-react";
import { RosterStatusBadge } from "@/components/roster/RosterStatusBadge";
import { PrivateClientPhoto } from "@/components/participants/PrivateClientPhoto";
import { getActualShiftHours, getRosterCoverageColour, getShiftAssignedWorkers, getShiftSignOffStatus, type RosterShift } from "@/lib/roster";
import { cn } from "@/lib/utils";

export function RosterShiftModal({
  shift,
  onClose,
  onComplete,
  onNoteCompleted,
  onCancelShift,
  onMarkVacant,
  onApproveSignOff,
  onRequestReplacement
}: {
  shift: RosterShift | null;
  onClose: () => void;
  onComplete: (shiftId: string) => void;
  onNoteCompleted: (shiftId: string) => void;
  onCancelShift: (shiftId: string) => void;
  onMarkVacant: (shiftId: string) => void;
  onApproveSignOff: (shiftId: string) => void;
  onRequestReplacement: (shiftId: string) => void;
}) {
  if (!shift) return null;

  const colour = getRosterCoverageColour(shift);
  const assignedWorkers = getShiftAssignedWorkers(shift);
  const signOffStatus = getShiftSignOffStatus(shift);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="roster-shift-title">
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-md bg-white shadow-lift">
        <div className={cn("h-2", colour.bg)} />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <PrivateClientPhoto path={shift.participantPhotoPath} alt={`${shift.participantName} profile`} fallback={shift.participantName.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase()} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <RosterStatusBadge status={shift.status} />
                  <span className={cn("inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-bold", colour.text)}>
                    <span className={cn("h-2 w-2 rounded-full", colour.dot)} aria-hidden="true" />
                    {colour.label}
                  </span>
                </div>
                <h2 id="roster-shift-title" className="mt-3 text-2xl font-bold text-ink">{shift.participantName}</h2>
                <p className="mt-1 text-sm font-medium text-slate-600">{shift.supportType}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Close shift details">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className={cn("rounded-md border p-4", colour.softBg, colour.border)}>
              <p className="text-sm font-semibold text-slate-600">Assigned staff{shift.staffingRatio ? ` - ${shift.staffingRatio}` : ""}</p>
              <div className="mt-2 space-y-1">
                {assignedWorkers.map((worker) => <p key={worker.id} className={cn("font-semibold", colour.text)}>{worker.name}</p>)}
              </div>
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
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">Shift sign-off</p>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{signOffStatus}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <p><span className="font-semibold text-slate-900">Scheduled:</span> {shift.startTime} - {shift.endTime}</p>
                <p><span className="font-semibold text-slate-900">Actual:</span> {shift.actualStartTime || "Not started"}{shift.actualEndTime ? ` - ${shift.actualEndTime}` : ""}</p>
              </div>
              {shift.actualStartTime && shift.actualEndTime ? <p className="mt-2 text-sm font-semibold text-slate-700">Actual hours: {getActualShiftHours(shift).toFixed(1)}h</p> : null}
              {shift.shiftSignOffNote ? <p className="mt-2 text-sm text-slate-700">{shift.shiftSignOffNote}</p> : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {signOffStatus === "Finished" ? <button type="button" onClick={() => onApproveSignOff(shift.id)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-100">
              <CheckCircle2 size={18} aria-hidden="true" />Approve actual hours
            </button> : null}
            <button type="button" onClick={() => onRequestReplacement(shift.id)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-sky-300 bg-sky-50 px-4 text-sm font-semibold text-sky-900 hover:bg-sky-100">
              <Send size={18} aria-hidden="true" />Find replacement
            </button>
            <button type="button" onClick={() => onMarkVacant(shift.id)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-950 hover:bg-amber-100">
              <UserX size={18} aria-hidden="true" />Mark vacant
            </button>
            <button type="button" onClick={() => onCancelShift(shift.id)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-900 hover:bg-red-100">
              <X size={18} aria-hidden="true" />Cancel shift
            </button>
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
