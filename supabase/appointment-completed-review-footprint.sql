-- Appointment completed-review metadata and compact display support.

alter table public.client_appointments
  add column if not exists admin_reviewed_at timestamptz,
  add column if not exists admin_review_note text,
  add column if not exists compact_after_review boolean not null default false;

create index if not exists client_appointments_completed_review_idx
  on public.client_appointments (organisation_id, status, compact_after_review, appointment_date);

notify pgrst, 'reload schema';
