-- Persists the source roster event used for each rendered billing service.
-- Run in the Supabase SQL Editor for the project connected to Vercel.

alter table public.support_shifts
  add column if not exists source_roster_shift_id text;

create unique index if not exists support_shifts_org_source_roster_unique
  on public.support_shifts (organisation_id, source_roster_shift_id)
  where source_roster_shift_id is not null;

notify pgrst, 'reload schema';
