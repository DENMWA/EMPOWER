"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { getTenantClients, type ClientRecord } from "@/lib/client-records";
import { getHousesForClient, getTenantHouses, type HouseRecord } from "@/lib/house-records";
import { appointmentSummary, appointmentTypes, saveTenantAppointment, type AppointmentStatus } from "@/lib/appointment-records";

type AppointmentComposerProps = {
  mode: "worker" | "admin";
  initialParticipantId?: string;
  initialHouseId?: string;
  compact?: boolean;
  onSaved?: () => void;
};

const appointmentStatuses: AppointmentStatus[] = ["Needs admin review", "Confirmed", "Completed", "Cancelled"];

export function AppointmentComposer({ mode, initialParticipantId = "", initialHouseId = "", compact = false, onSaved }: AppointmentComposerProps) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [participantId, setParticipantId] = useState(initialParticipantId);
  const [houseId, setHouseId] = useState(initialHouseId);
  const [appointmentType, setAppointmentType] = useState(appointmentTypes[0]);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [appointmentTime, setAppointmentTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [supportRequired, setSupportRequired] = useState("");
  const [arrangedBy, setArrangedBy] = useState(mode === "admin" ? "Admin" : "Support worker");
  const [attendingStaff, setAttendingStaff] = useState("");
  const [reason, setReason] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [adminReviewNote, setAdminReviewNote] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>(mode === "admin" ? "Confirmed" : "Needs admin review");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      getTenantClients().catch(() => []),
      getTenantHouses().catch(() => [])
    ]).then(([clientRecords, houseRecords]) => {
      setClients(clientRecords);
      setHouses(houseRecords);
    });
  }, []);

  useEffect(() => {
    if (initialParticipantId) setParticipantId(initialParticipantId);
  }, [initialParticipantId]);

  useEffect(() => {
    if (initialHouseId) setHouseId(initialHouseId);
  }, [initialHouseId]);

  const selectedClient = clients.find((client) => client.id === participantId) || clients[0];
  const availableHouses = useMemo(() => selectedClient ? getHousesForClient(houses, selectedClient) : [], [houses, selectedClient]);
  const selectedHouse = availableHouses.find((house) => house.id === houseId) || availableHouses[0];

  useEffect(() => {
    if (!participantId && clients[0]) setParticipantId(clients[0].id);
  }, [clients, participantId]);

  useEffect(() => {
    if (selectedHouse?.id && selectedHouse.id !== houseId) setHouseId(selectedHouse.id);
    if (!availableHouses.length && houseId) setHouseId("");
  }, [availableHouses, houseId, selectedHouse?.id]);

  async function saveAppointment() {
    if (!selectedClient) return setMessage("Select a client before saving the appointment.");
    if (!appointmentDate) return setMessage("Select the appointment date.");
    setSaving(true);
    const result = await saveTenantAppointment({
      participantId: selectedClient.id,
      participantName: selectedClient.name,
      houseId: selectedHouse?.id || "",
      houseName: selectedHouse?.name || selectedClient.primaryHouseName || "",
      appointmentType,
      appointmentDate,
      appointmentTime,
      location,
      supportRequired,
      arrangedBy,
      attendingStaff,
      reason,
      followUpRequired,
      outcomeNotes,
      status,
      adminReviewedAt: mode === "admin" && status === "Completed" ? new Date().toISOString() : undefined,
      adminReviewNote: mode === "admin" && status === "Completed" ? adminReviewNote : undefined,
      compactAfterReview: mode === "admin" && status === "Completed"
    });
    setMessage(result.savedToCloud ? "Appointment saved to the workspace." : result.error || "Appointment saved on this device.");
    if (result.saved) {
      onSaved?.();
      if (mode === "worker") setStatus("Needs admin review");
    }
    setSaving(false);
  }

  const summary = selectedClient ? appointmentSummary({
    id: "preview",
    participantId: selectedClient.id,
    participantName: selectedClient.name,
    houseId: selectedHouse?.id || "",
    houseName: selectedHouse?.name || selectedClient.primaryHouseName || "",
    appointmentType,
    appointmentDate,
    appointmentTime,
    location,
    supportRequired,
    arrangedBy,
    attendingStaff,
    reason,
    followUpRequired,
    outcomeNotes,
    status,
    adminReviewedAt: mode === "admin" && status === "Completed" ? new Date().toISOString() : undefined,
    adminReviewNote: mode === "admin" && status === "Completed" ? adminReviewNote : undefined,
    compactAfterReview: mode === "admin" && status === "Completed",
    createdBy: "",
    createdAt: "",
    updatedAt: ""
  }) : "";

  const inputClass = compact
    ? "mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
    : "mt-2 w-full rounded-md border border-slate-300 bg-white p-3 shadow-sm";
  const textAreaClass = compact
    ? "mt-1.5 min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 shadow-sm"
    : "mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 text-sm leading-6 shadow-sm";

  return (
    <Card className={compact ? "border-sky-100 bg-white p-4 shadow-none" : "border-sky-100"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-sea">{mode === "admin" ? "Admin appointment" : "Appointment support"}</p>
          <h2 className={compact ? "mt-1 text-lg font-bold text-ink" : "mt-1 text-2xl font-bold text-ink"}>{mode === "admin" ? "Add or confirm appointment" : "Add appointment and reminder"}</h2>
          <p className={compact ? "mt-1 max-w-2xl text-xs leading-5 text-slate-600" : "mt-2 max-w-3xl text-sm leading-6 text-slate-600"}>Save the appointment once, then the reminder appears as the date approaches.</p>
        </div>
        <StatusBadge label={mode === "admin" ? "Admin can edit all" : "Needs review by default"} tone={mode === "admin" ? "green" : "amber"} />
      </div>

      <div className={compact ? "mt-4 grid gap-3 sm:grid-cols-2" : "mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"}>
        <label className="text-sm font-semibold text-slate-700">
          Client
          <select className={inputClass} value={selectedClient?.id || ""} onChange={(event) => setParticipantId(event.target.value)}>
            {!clients.length ? <option value="">No clients available</option> : null}
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          House/service
          <select className={inputClass} value={selectedHouse?.id || ""} onChange={(event) => setHouseId(event.target.value)}>
            {!availableHouses.length ? <option value="">No house assigned</option> : null}
            {availableHouses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Appointment type
          <select className={inputClass} value={appointmentType} onChange={(event) => setAppointmentType(event.target.value)}>
            {appointmentTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Status
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus)} disabled={mode === "worker"}>
            {appointmentStatuses.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Date
          <input type="date" className={inputClass} value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Time
          <input type="time" className={inputClass} value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-slate-700 xl:col-span-2">
          Location or telehealth
          <input className={inputClass} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Clinic, address, or video link" />
        </label>
      </div>

      <details className={compact ? "mt-3 rounded-md border border-slate-200 bg-slate-50 p-3" : "mt-4 rounded-md border border-slate-200 bg-white p-3"} open={!compact}>
        <summary className="cursor-pointer text-sm font-semibold text-ink">{compact ? "More appointment details" : "Appointment details"}</summary>
        <div className={compact ? "mt-3 grid gap-3 md:grid-cols-2" : "grid gap-4 md:grid-cols-2"}>
        <label className="text-sm font-semibold text-slate-700">
          Transport/support required
          <textarea className={textAreaClass} value={supportRequired} onChange={(event) => setSupportRequired(event.target.value)} placeholder="Transport, documents, communication support, behaviour support plan, medication list..." />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Reason / notes
          <textarea className={textAreaClass} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why the appointment was arranged and what staff need to know." />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Arranged by
          <input className={inputClass} value={arrangedBy} onChange={(event) => setArrangedBy(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Attending staff / support person
          <input className={inputClass} value={attendingStaff} onChange={(event) => setAttendingStaff(event.target.value)} placeholder="Staff member, family, advocate, or to be confirmed" />
        </label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">
          Follow-up required after appointment
          <input className={inputClass} value={followUpRequired} onChange={(event) => setFollowUpRequired(event.target.value)} placeholder="Outcome note, medication change, document upload, next booking..." />
        </label>
        {mode === "admin" && status === "Completed" ? (
          <>
            <label className="text-sm font-semibold text-slate-700">
              Outcome notes
              <textarea className={textAreaClass} value={outcomeNotes} onChange={(event) => setOutcomeNotes(event.target.value)} placeholder="What happened, key outcome, documents received, or follow-up arranged." />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Admin review note
              <textarea className={textAreaClass} value={adminReviewNote} onChange={(event) => setAdminReviewNote(event.target.value)} placeholder="Manager review, closure decision, or next action confirmed." />
            </label>
          </>
        ) : null}
        </div>
      </details>

      <details className="mt-4 rounded-md border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Preview appointment note</summary>
        <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{summary}</pre>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving} onClick={() => void saveAppointment()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sea px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-wait disabled:bg-slate-400">
          {saving ? <CheckCircle2 size={17} aria-hidden="true" /> : <CalendarPlus size={17} aria-hidden="true" />}
          {saving ? "Saving..." : "Save appointment"}
        </button>
        {message ? <p className="text-sm font-semibold text-slate-700">{message}</p> : null}
      </div>
    </Card>
  );
}
