-- Optional, organisation-scoped service locations for roster shifts.
-- Additive and backwards compatible: client-home/community shifts remain valid without a location record.

alter table public.support_shifts
  add column if not exists service_location_id text;

do $$ begin
  alter table public.support_shifts
    add constraint support_shifts_service_location_fk
    foreign key (organisation_id, service_location_id)
    references public.service_locations(organisation_id, id)
    on delete restrict;
exception when duplicate_object then null; end $$;

create index if not exists support_shifts_service_location_time_idx
  on public.support_shifts (organisation_id, service_location_id, start_time)
  where service_location_id is not null;

create or replace function public.save_roster_shift_with_service_location(
  roster_shift_id uuid,
  roster_participant_id uuid,
  roster_title text,
  roster_support_type text,
  roster_location text,
  roster_shift_date date,
  roster_start_time time,
  roster_end_time time,
  roster_status text,
  roster_shift_instructions text,
  roster_staffing_ratio text,
  roster_note_required boolean,
  roster_note_completed boolean,
  roster_assignments jsonb,
  roster_service_location_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_organisation_id uuid;
  saved_shift_id uuid;
begin
  select organisation_id into actor_organisation_id
  from public.users
  where id = auth.uid()
    and role in ('team_leader', 'house_manager', 'case_manager', 'service_manager', 'operations_manager', 'admin', 'owner', 'sole_provider');

  if actor_organisation_id is null then
    raise exception 'Roster management access is required.' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(roster_service_location_id, '')), '') is not null
    and not exists (
      select 1 from public.service_locations
      where organisation_id = actor_organisation_id
        and id = roster_service_location_id
        and status = 'active'
    ) then
    raise exception 'The selected service location is unavailable in this organisation.' using errcode = '42501';
  end if;

  saved_shift_id := public.save_roster_shift_with_staff(
    roster_shift_id, roster_participant_id, roster_title, roster_support_type,
    roster_location, roster_shift_date, roster_start_time, roster_end_time,
    roster_status, roster_shift_instructions, roster_staffing_ratio,
    roster_note_required, roster_note_completed, roster_assignments
  );

  update public.support_shifts
  set service_location_id = nullif(trim(coalesce(roster_service_location_id, '')), ''),
      updated_at = now()
  where id = saved_shift_id
    and organisation_id = actor_organisation_id;

  return saved_shift_id;
end;
$$;

revoke all on function public.save_roster_shift_with_service_location(uuid, uuid, text, text, text, date, time, time, text, text, text, boolean, boolean, jsonb, text) from public, anon;
grant execute on function public.save_roster_shift_with_service_location(uuid, uuid, text, text, text, date, time, time, text, text, text, boolean, boolean, jsonb, text) to authenticated;

comment on column public.support_shifts.service_location_id is
  'Optional organisation service location. Null represents flexible services such as client home, community or another entered address.';
