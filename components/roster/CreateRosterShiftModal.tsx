"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import { createRosterShift, getRosterSelectOptions, type RosterShift } from "@/lib/roster";

export function CreateRosterShiftModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (shift: RosterShift) => void }) {
  const { participants, workers, supportTypes } = getRosterSelectOptions();
  const [participantId, setParticipantId] = useState(participants[0]?.id ?? "");
  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "");
  const [supportType, setSupportType] = useState(supportTypes[0] ?? "Community access");
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("Community");
  const [shiftInstructions, setShiftInstructions] = useState("Capture support provided, participant response, and any follow-up actions.");

  if (!open) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate(createRosterShift({
      participantId,
      workerId,
      supportType,
      shiftDate,
      startTime,
      endTime,
      location,
      shiftInstructions,
      status: "Scheduled",
      noteRequired: true,
      noteCompleted: false
    }));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="create-roster-shift-title">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-md bg-white shadow-lift">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sea">Create shift</p>
            <h2 id="create-roster-shift-title" className="mt-1 text-2xl font-bold text-ink">Roster a support shift</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Close create shift form">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Participant
            <select className="min-h-11 rounded-md border border-slate-300 px-3" value={participantId} onChange={(event) => setParticipantId(event.target.value)}>
              {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Worker
            <select className="min-h-11 rounded-md border border-slate-300 px-3" value={workerId} onChange={(event) => setWorkerId(event.target.value)}>
              {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Support type
            <select className="min-h-11 rounded-md border border-slate-300 px-3" value={supportType} onChange={(event) => setSupportType(event.target.value)}>
              {supportTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Date
            <input className="min-h-11 rounded-md border border-slate-300 px-3" type="date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Start time
            <input className="min-h-11 rounded-md border border-slate-300 px-3" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            End time
            <input className="min-h-11 rounded-md border border-slate-300 px-3" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Location
            <input className="min-h-11 rounded-md border border-slate-300 px-3" value={location} onChange={(event) => setLocation(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Shift instructions
            <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2" value={shiftInstructions} onChange={(event) => setShiftInstructions(event.target.value)} />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 p-5">
          <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-ink hover:bg-slate-50">Cancel</button>
          <button type="submit" className="min-h-11 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">Create shift</button>
        </div>
      </form>
    </div>
  );
}
