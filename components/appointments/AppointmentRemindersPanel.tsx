"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarClock, RefreshCw } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import {
  appointmentsUpdatedEvent,
  formatAppointmentDate,
  getAppointmentReminderLabel,
  getAppointmentReminderStage,
  getReminderTone,
  getTenantAppointments,
  type ClientAppointment
} from "@/lib/appointment-records";

type AppointmentRemindersPanelProps = {
  title?: string;
  subtitle?: string;
  limit?: number;
  adminView?: boolean;
};

export function AppointmentRemindersPanel({
  title = "Upcoming appointments",
  subtitle = "Appointments and follow-ups that need attention.",
  limit = 5,
  adminView = false
}: AppointmentRemindersPanelProps) {
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setAppointments(await getTenantAppointments().catch(() => []));
    setLoading(false);
  }

  useEffect(() => {
    void load();
    window.addEventListener(appointmentsUpdatedEvent, load);
    return () => window.removeEventListener(appointmentsUpdatedEvent, load);
  }, []);

  const reminderItems = useMemo(() => appointments
    .filter((appointment) => appointment.status !== "Cancelled")
    .map((appointment) => ({ appointment, stage: getAppointmentReminderStage(appointment) }))
    .filter(({ stage }) => adminView || stage !== "later")
    .sort((left, right) => {
      const priority = { "overdue-follow-up": 0, today: 1, "2-days": 2, "7-days": 3, later: 4 };
      return priority[left.stage] - priority[right.stage]
        || left.appointment.appointmentDate.localeCompare(right.appointment.appointmentDate)
        || left.appointment.appointmentTime.localeCompare(right.appointment.appointmentTime);
    })
    .slice(0, limit), [adminView, appointments, limit]);

  const dueSoon = appointments.filter((appointment) => {
    const stage = getAppointmentReminderStage(appointment);
    return stage !== "later" && appointment.status !== "Cancelled";
  }).length;

  return (
    <Card className="border-sky-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">Client calendar</p>
          <h2 className="mt-1 text-xl font-bold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh appointments" className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-300 bg-white text-slate-700">
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge label={`${dueSoon} due soon`} tone={dueSoon ? "amber" : "green"} />
        <StatusBadge label={`${appointments.length} total`} tone="blue" />
      </div>
      <div className="mt-4 space-y-3">
        {!loading && !reminderItems.length ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="font-semibold text-ink">No appointment reminders due</p>
            <p className="mt-1 text-sm text-slate-600">Appointments will appear here one week before they are due.</p>
          </div>
        ) : null}
        {reminderItems.map(({ appointment, stage }) => (
          <article key={appointment.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{appointment.participantName}</p>
                <p className="mt-1 text-sm text-slate-600">{appointment.appointmentType} · {getAppointmentReminderLabel(appointment)}</p>
              </div>
              <StatusBadge label={appointment.status} tone={appointment.status === "Needs admin review" ? "amber" : appointment.status === "Completed" ? "green" : getReminderTone(stage)} />
            </div>
            <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <div><dt className="font-semibold text-slate-700">House/service</dt><dd>{appointment.houseName || "Not selected"}</dd></div>
              <div><dt className="font-semibold text-slate-700">Date</dt><dd>{formatAppointmentDate(appointment.appointmentDate)}{appointment.appointmentTime ? ` at ${appointment.appointmentTime}` : ""}</dd></div>
              <div><dt className="font-semibold text-slate-700">Location</dt><dd>{appointment.location || "Not recorded"}</dd></div>
              <div><dt className="font-semibold text-slate-700">Follow-up</dt><dd>{appointment.followUpRequired || "Outcome note after appointment"}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <Link href="/notes/new" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-teal-300 bg-teal-50 px-4 text-sm font-semibold text-teal-900">
        Add appointment from progress notes <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </Card>
  );
}
