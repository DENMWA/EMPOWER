"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import { createRosterShift, getRosterSelectOptions, type RosterShift } from "@/lib/roster";
import { getTenantClients } from "@/lib/client-records";
import { getTenantStaffInvites } from "@/lib/staff-records";

export function CreateRosterShiftModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (shift: RosterShift) => string | void }) {
  const { supportTypes } = getRosterSelectOptions();
  const [participantOptions, setParticipantOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [workerOptions, setWorkerOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [participantId, setParticipantId] = useState("");
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [staffingRatio, setStaffingRatio] = useState("1:1");
  const [supportType, setSupportType] = useState(supportTypes[0] ?? "Community access");
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("Community");
  const [shiftInstructions, setShiftInstructions] = useState("Capture support provided, participant response, and any follow-up actions.");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([getTenantClients(), getTenantStaffInvites()]).then(([clients, staff]) => {
      const nextParticipants = clients.map(({ id, name }) => ({ id, name }));
      const nextWorkers = staff.map(({ id, name }) => ({ id, name }));
      setParticipantOptions(nextParticipants);
      setParticipantId((current) => nextParticipants.some((item) => item.id === current) ? current : nextParticipants[0]?.id || "");
      setWorkerOptions(nextWorkers);
      setSelectedWorkerIds((current) => {
        const valid = current.filter((workerId) => nextWorkers.some((item) => item.id === workerId));
        return valid.length ? valid : nextWorkers[0]?.id ? [nextWorkers[0].id] : [];
      });
    }).catch(() => undefined);
  }, [open]);

  if (!open) return null;

  function toggleWorker(workerId: string) {
    setError("");
    setSelectedWorkerIds((current) => current.includes(workerId) ? current.filter((id) => id !== workerId) : [...current, workerId]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!participantId) {
      setError("Add a client before creating a roster shift.");
      return;
    }
    if (endTime <= startTime) {
      setError("End time must be later than start time.");
      return;
    }
    const assignedWorkers = workerOptions.filter((worker) => selectedWorkerIds.includes(worker.id));
    if (!assignedWorkers.length) {
      setError("Select at least one staff member for this shift.");
      return;
    }
    const expectedStaffCount = Number(staffingRatio.split(":")[0]);
    if (Number.isFinite(expectedStaffCount) && staffingRatio !== "group" && assignedWorkers.length !== expectedStaffCount) {
      setError(`${staffingRatio} support requires ${expectedStaffCount} assigned staff member${expectedStaffCount === 1 ? "" : "s"}.`);
      return;
    }
    const creationError = onCreate(createRosterShift({
      participantId,
      participantName: participantOptions.find((item) => item.id === participantId)?.name,
      workerId: assignedWorkers[0].id,
      workerName: assignedWorkers[0].name,
      assignedWorkers,
      staffingRatio,
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
    if (creationError) {
      setError(creationError);
      return;
    }
    setError("");
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
              {!participantOptions.length ? <option value="">No clients available</option> : null}
              {participantOptions.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
            </select>
          </label>
          <fieldset className="grid gap-2 rounded-md border border-slate-200 p-3 sm:col-span-2">
            <legend className="px-1 text-sm font-medium text-slate-700">Assigned staff</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {!workerOptions.length ? <p className="text-sm text-slate-600">Add staff before creating a roster shift.</p> : null}
              {workerOptions.map((worker) => (
                <label key={worker.id} className="flex min-h-11 items-center gap-2 rounded-md bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={selectedWorkerIds.includes(worker.id)} onChange={() => toggleWorker(worker.id)} className="h-4 w-4 accent-teal-700" />
                  {worker.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Staffing ratio
            <select className="min-h-11 rounded-md border border-slate-300 px-3" value={staffingRatio} onChange={(event) => setStaffingRatio(event.target.value)}>
              <option value="1:1">1:1</option>
              <option value="2:1">2:1</option>
              <option value="3:1">3:1</option>
              <option value="1:2">1:2</option>
              <option value="group">Group support</option>
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

        {error ? <p className="mx-5 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 p-5">
          <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-ink hover:bg-slate-50">Cancel</button>
          <button type="submit" className="min-h-11 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-lift hover:bg-teal-800">Create shift</button>
        </div>
      </form>
    </div>
  );
}
