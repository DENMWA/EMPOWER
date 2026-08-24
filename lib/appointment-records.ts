import { getCurrentOrganisationId, getCurrentUserId, supabaseRequest } from "@/lib/supabase-rest";
import { tenantStorageKey } from "@/lib/tenant-storage";

export type AppointmentStatus = "Needs admin review" | "Confirmed" | "Completed" | "Cancelled";
export type AppointmentReminderStage = "overdue-follow-up" | "today" | "2-days" | "7-days" | "later";

export type ClientAppointment = {
  id: string;
  participantId: string;
  participantName: string;
  houseId: string;
  houseName: string;
  appointmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  location: string;
  supportRequired: string;
  arrangedBy: string;
  attendingStaff: string;
  reason: string;
  followUpRequired: string;
  outcomeNotes: string;
  status: AppointmentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type AppointmentRow = {
  id: string;
  participant_id: string;
  participant_name: string | null;
  house_id: string | null;
  house_name: string | null;
  appointment_type: string;
  appointment_date: string;
  appointment_time: string | null;
  location: string | null;
  support_required: string | null;
  arranged_by: string | null;
  attending_staff: string | null;
  reason: string | null;
  follow_up_required: string | null;
  outcome_notes: string | null;
  status: AppointmentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

const appointmentStorageKey = "empowernotes:client-appointments";
export const appointmentsUpdatedEvent = "empowernotes:appointments-updated";

export const appointmentTypes = [
  "GP appointment",
  "Specialist appointment",
  "Allied health",
  "Behaviour support",
  "Plan meeting",
  "Medication review",
  "Therapy session",
  "Community appointment",
  "Other"
];

export function createAppointmentId() {
  return globalThis.crypto?.randomUUID?.() || `appointment-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function getAppointmentReminderStage(appointment: Pick<ClientAppointment, "appointmentDate" | "status" | "outcomeNotes">): AppointmentReminderStage {
  if (appointment.status === "Completed" || appointment.status === "Cancelled") return "later";
  const today = dateOnly(new Date());
  const appointmentDay = appointment.appointmentDate;
  const daysUntil = Math.ceil((new Date(`${appointmentDay}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000);
  if (daysUntil < 0 && !appointment.outcomeNotes.trim()) return "overdue-follow-up";
  if (daysUntil === 0) return "today";
  if (daysUntil <= 2) return "2-days";
  if (daysUntil <= 7) return "7-days";
  return "later";
}

export function getAppointmentReminderLabel(appointment: Pick<ClientAppointment, "appointmentDate" | "appointmentTime" | "status" | "outcomeNotes">) {
  const stage = getAppointmentReminderStage(appointment);
  const date = formatAppointmentDate(appointment.appointmentDate);
  const time = appointment.appointmentTime || "time not set";
  if (stage === "overdue-follow-up") return `Follow-up due from ${date}`;
  if (stage === "today") return `Today at ${time}`;
  if (stage === "2-days") return `Soon: ${date} at ${time}`;
  if (stage === "7-days") return `Upcoming: ${date}`;
  return `${date}${appointment.appointmentTime ? ` at ${appointment.appointmentTime}` : ""}`;
}

export function getReminderTone(stage: AppointmentReminderStage): "green" | "amber" | "red" | "blue" | "slate" {
  if (stage === "overdue-follow-up") return "red";
  if (stage === "today") return "amber";
  if (stage === "2-days") return "amber";
  if (stage === "7-days") return "blue";
  return "slate";
}

export function formatAppointmentDate(value: string) {
  if (!value) return "Date not set";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function appointmentSummary(appointment: ClientAppointment) {
  return [
    `Appointment: ${appointment.appointmentType}`,
    `Client: ${appointment.participantName}`,
    `House/service: ${appointment.houseName || "Not selected"}`,
    `Date/time: ${formatAppointmentDate(appointment.appointmentDate)}${appointment.appointmentTime ? ` at ${appointment.appointmentTime}` : ""}`,
    `Location: ${appointment.location || "Not recorded"}`,
    `Support required: ${appointment.supportRequired || "Not recorded"}`,
    `Arranged by: ${appointment.arrangedBy || "Not recorded"}`,
    `Attending: ${appointment.attendingStaff || "Not recorded"}`,
    `Reason: ${appointment.reason || "Not recorded"}`,
    `Follow-up: ${appointment.followUpRequired || "Not recorded"}`,
    `Status: ${appointment.status}`
  ].join("\n");
}

export async function getTenantAppointments() {
  const local = getLocalAppointments();
  const result = await supabaseRequest<AppointmentRow[]>("client_appointments", {
    query: "select=id,participant_id,participant_name,house_id,house_name,appointment_type,appointment_date,appointment_time,location,support_required,arranged_by,attending_staff,reason,follow_up_required,outcome_notes,status,created_by,created_at,updated_at&order=appointment_date.asc,appointment_time.asc"
  });
  const cloud = (result.data || []).map(fromRow);
  return mergeAppointments(cloud, local);
}

export async function saveTenantAppointment(input: Omit<ClientAppointment, "id" | "createdBy" | "createdAt" | "updatedAt"> & { id?: string }) {
  const now = new Date().toISOString();
  const appointment: ClientAppointment = {
    ...input,
    id: input.id || createAppointmentId(),
    createdBy: getCurrentUserId(),
    createdAt: now,
    updatedAt: now
  };
  addLocalAppointment(appointment);

  const organisationId = await getCurrentOrganisationId();
  const userId = getCurrentUserId();
  if (!organisationId || !userId) return { saved: true, savedToCloud: false, error: "Saved on this device. Sign in to save it to the organisation workspace.", appointment };

  const result = await supabaseRequest<Array<{ id: string }>>("client_appointments", {
    method: "POST",
    query: "on_conflict=organisation_id,id",
    prefer: "resolution=merge-duplicates,return=representation",
    body: toRow(appointment, organisationId, userId)
  });
  if (result.data?.length && !result.error) return { saved: true, savedToCloud: true, error: "", appointment };
  return { saved: true, savedToCloud: false, error: result.error || "Saved on this device. Workspace sync did not complete.", appointment };
}

function getLocalAppointments() {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(tenantStorageKey(appointmentStorageKey));
    return stored ? (JSON.parse(stored) as ClientAppointment[]) : [];
  } catch {
    return [];
  }
}

function saveLocalAppointments(appointments: ClientAppointment[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(tenantStorageKey(appointmentStorageKey), JSON.stringify(appointments));
  window.dispatchEvent(new Event(appointmentsUpdatedEvent));
}

function addLocalAppointment(appointment: ClientAppointment) {
  const current = getLocalAppointments().filter((item) => item.id !== appointment.id);
  saveLocalAppointments([appointment, ...current].slice(0, 500));
}

function mergeAppointments(cloud: ClientAppointment[], local: ClientAppointment[]) {
  const byId = new Map<string, ClientAppointment>();
  for (const appointment of [...local, ...cloud]) byId.set(appointment.id, appointment);
  return [...byId.values()].sort((left, right) =>
    left.appointmentDate.localeCompare(right.appointmentDate)
    || left.appointmentTime.localeCompare(right.appointmentTime)
    || right.createdAt.localeCompare(left.createdAt)
  );
}

function fromRow(row: AppointmentRow): ClientAppointment {
  return {
    id: row.id,
    participantId: row.participant_id,
    participantName: row.participant_name || "Client",
    houseId: row.house_id || "",
    houseName: row.house_name || "",
    appointmentType: row.appointment_type,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time || "",
    location: row.location || "",
    supportRequired: row.support_required || "",
    arrangedBy: row.arranged_by || "",
    attendingStaff: row.attending_staff || "",
    reason: row.reason || "",
    followUpRequired: row.follow_up_required || "",
    outcomeNotes: row.outcome_notes || "",
    status: row.status,
    createdBy: row.created_by || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  };
}

function toRow(appointment: ClientAppointment, organisationId: string, userId: string) {
  return {
    id: appointment.id,
    organisation_id: organisationId,
    participant_id: appointment.participantId,
    participant_name: appointment.participantName,
    house_id: appointment.houseId || null,
    house_name: appointment.houseName || null,
    appointment_type: appointment.appointmentType,
    appointment_date: appointment.appointmentDate,
    appointment_time: appointment.appointmentTime || null,
    location: appointment.location || null,
    support_required: appointment.supportRequired || null,
    arranged_by: appointment.arrangedBy || null,
    attending_staff: appointment.attendingStaff || null,
    reason: appointment.reason || null,
    follow_up_required: appointment.followUpRequired || null,
    outcome_notes: appointment.outcomeNotes || null,
    status: appointment.status,
    created_by: appointment.createdBy || userId,
    updated_at: appointment.updatedAt
  };
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
