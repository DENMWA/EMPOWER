-- EmpowerNotes roster sign-in/sign-off support
-- Run this in the same Supabase project used by the deployed app.

alter table public.support_shifts
  add column if not exists actual_start_time timestamptz,
  add column if not exists actual_end_time timestamptz,
  add column if not exists shift_signoff_status text default 'not_started',
  add column if not exists shift_signoff_note text,
  add column if not exists shift_signed_off_by uuid references auth.users(id) on delete set null,
  add column if not exists shift_approved_at timestamptz,
  add column if not exists shift_approved_by uuid references auth.users(id) on delete set null;

alter table public.support_shifts
  drop constraint if exists support_shifts_signoff_status_check;

alter table public.support_shifts
  add constraint support_shifts_signoff_status_check
  check (shift_signoff_status in ('not_started', 'started', 'finished', 'approved'));

create index if not exists idx_support_shifts_signoff_status
  on public.support_shifts(organisation_id, shift_signoff_status, start_time);

create index if not exists idx_support_shifts_signed_off_by
  on public.support_shifts(organisation_id, shift_signed_off_by, start_time);
