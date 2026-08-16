-- EmpowerNotes availability and controlled roster replacement offers.
-- Run after roster-cloud-sync.sql and membership-authority-hardening.sql.

create table if not exists public.staff_availability (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  staff_invite_id uuid not null references public.staff_invites(id) on delete cascade,
  weekday smallint check (weekday between 0 and 6),
  specific_date date,
  start_time time not null,
  end_time time not null,
  availability_kind text not null default 'available' check (availability_kind in ('available','preferred','unavailable')),
  recurring boolean not null default true,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((weekday is not null) <> (specific_date is not null)),
  check (end_time > start_time)
);

create table if not exists public.roster_replacement_offers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  shift_id uuid not null references public.support_shifts(id) on delete cascade,
  staff_invite_id uuid not null references public.staff_invites(id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','withdrawn')),
  delivery_channel text not null default 'email' check (delivery_channel in ('email','sms','in_app')),
  delivery_reference text,
  offered_by uuid not null references auth.users(id),
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists staff_availability_org_staff_idx on public.staff_availability(organisation_id, staff_invite_id);
create index if not exists roster_replacement_offers_shift_idx on public.roster_replacement_offers(organisation_id, shift_id, status);

alter table public.staff_availability enable row level security;
alter table public.roster_replacement_offers enable row level security;

drop policy if exists "managers view staff availability" on public.staff_availability;
create policy "managers view staff availability" on public.staff_availability for select to authenticated
using (organisation_id = public.current_user_organisation_id() and public.current_user_is_manager());
drop policy if exists "managers create staff availability" on public.staff_availability;
drop policy if exists "managers update staff availability" on public.staff_availability;

drop policy if exists "managers view replacement offers" on public.roster_replacement_offers;
create policy "managers view replacement offers" on public.roster_replacement_offers for select to authenticated
using (organisation_id = public.current_user_organisation_id() and public.current_user_is_manager());

revoke all on public.staff_availability, public.roster_replacement_offers from anon;
grant select on public.staff_availability to authenticated;
grant select on public.roster_replacement_offers to authenticated;

comment on table public.staff_availability is 'Organisation-scoped recurring or date-specific staff availability used by roster recommendations.';
comment on table public.roster_replacement_offers is 'Expiring, single-use roster coverage offers. Tokens are stored only as hashes.';

create or replace function public.save_staff_availability(
  availability_id uuid,
  availability_staff_invite_id uuid,
  availability_weekday smallint,
  availability_specific_date date,
  availability_start_time time,
  availability_end_time time,
  availability_kind text,
  availability_recurring boolean,
  availability_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  tenant_id uuid := public.current_user_organisation_id();
begin
  if actor_id is null or tenant_id is null or not public.current_user_is_manager() then
    raise exception 'Roster management access is required.' using errcode='42501';
  end if;
  if not exists(select 1 from public.staff_invites where id=availability_staff_invite_id and organisation_id=tenant_id and lower(invite_status) <> 'suspended') then
    raise exception 'The selected staff member is unavailable in this organisation.' using errcode='42501';
  end if;
  insert into public.staff_availability(id,organisation_id,staff_invite_id,weekday,specific_date,start_time,end_time,availability_kind,recurring,notes,created_by,updated_at)
  values(availability_id,tenant_id,availability_staff_invite_id,availability_weekday,availability_specific_date,availability_start_time,availability_end_time,availability_kind,availability_recurring,availability_notes,actor_id,now())
  on conflict(id) do update set weekday=excluded.weekday,specific_date=excluded.specific_date,start_time=excluded.start_time,end_time=excluded.end_time,availability_kind=excluded.availability_kind,recurring=excluded.recurring,notes=excluded.notes,updated_at=now()
  where public.staff_availability.organisation_id=tenant_id;
  return availability_id;
end;
$$;

revoke all on function public.save_staff_availability(uuid,uuid,smallint,date,time,time,text,boolean,text) from public,anon;
grant execute on function public.save_staff_availability(uuid,uuid,smallint,date,time,time,text,boolean,text) to authenticated;
