-- Client appointments and reminder-ready appointment records.
create table if not exists public.client_appointments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  participant_id uuid not null references public.participants_or_clients(id) on delete cascade,
  participant_name text,
  house_id uuid references public.service_locations(id) on delete set null,
  house_name text,
  appointment_type text not null default 'Other',
  appointment_date date not null,
  appointment_time time,
  location text,
  support_required text,
  arranged_by text,
  attending_staff text,
  reason text,
  follow_up_required text,
  outcome_notes text,
  status text not null default 'Needs admin review'
    check (status in ('Needs admin review','Confirmed','Completed','Cancelled')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_appointments_org_date_idx
  on public.client_appointments (organisation_id, appointment_date, appointment_time);

create index if not exists client_appointments_participant_idx
  on public.client_appointments (organisation_id, participant_id, appointment_date);

alter table public.client_appointments enable row level security;

create or replace function public.set_client_appointment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_appointments_touch_updated_at on public.client_appointments;
create trigger client_appointments_touch_updated_at
before update on public.client_appointments
for each row execute function public.set_client_appointment_updated_at();

drop policy if exists "appointments visible by active client scope" on public.client_appointments;
create policy "appointments visible by active client scope"
on public.client_appointments
for select to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and private.current_user_can_access_participant(participant_id, appointment_date)
);

drop policy if exists "workers create appointments by active client scope" on public.client_appointments;
create policy "workers create appointments by active client scope"
on public.client_appointments
for insert to authenticated
with check (
  organisation_id = public.current_user_organisation_id()
  and created_by = (select auth.uid())
  and private.current_user_can_access_participant(participant_id, appointment_date)
);

drop policy if exists "appointment owners and managers update records" on public.client_appointments;
create policy "appointment owners and managers update records"
on public.client_appointments
for update to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.organisation_memberships om
      where om.organisation_id = client_appointments.organisation_id
        and om.user_id = (select auth.uid())
        and om.access_status = 'active'
        and (
          om.role::text in ('owner','admin','sole_provider','service_manager','operations_manager','case_manager','team_leader','house_manager')
          or 'shift_verification' = any(coalesce(om.admin_permissions, '{}'::text[]))
        )
    )
  )
)
with check (
  organisation_id = public.current_user_organisation_id()
  and private.current_user_can_access_participant(participant_id, appointment_date)
);

notify pgrst, 'reload schema';
