-- EmpowerNotes cloud roster and atomic multi-staff assignment saving.
-- Run after scheduling-native-invoicing.sql and scheduling-native-invoicing-phase1.sql.
-- Safe to run more than once.

alter table public.support_shifts
  add column if not exists shift_instructions text,
  add column if not exists staffing_ratio text,
  add column if not exists note_required boolean not null default true,
  add column if not exists note_completed boolean not null default false,
  add column if not exists source_roster_shift_id text;

create or replace function public.save_roster_shift_with_staff(
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
  roster_assignments jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_organisation_id uuid;
  assignment jsonb;
  invite_id uuid;
  assigned_user_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select organisation_id
    into actor_organisation_id
  from public.users
  where id = actor_id
    and role in ('team_leader', 'case_manager', 'service_manager', 'admin', 'owner', 'sole_provider');

  if actor_organisation_id is null then
    raise exception 'Roster management access is required.' using errcode = '42501';
  end if;

  if roster_shift_id is null or roster_participant_id is null then
    raise exception 'Shift and participant identifiers are required.' using errcode = '22023';
  end if;

  if roster_end_time <= roster_start_time then
    raise exception 'Shift end time must be later than start time.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.participants_or_clients
    where id = roster_participant_id
      and organisation_id = actor_organisation_id
  ) then
    raise exception 'The selected participant does not belong to this organisation.' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(roster_assignments, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(roster_assignments, '[]'::jsonb)) = 0 then
    raise exception 'Assign at least one staff member.' using errcode = '22023';
  end if;

  insert into public.support_shifts (
    id, organisation_id, participant_id, title, support_type, location,
    start_time, end_time, timezone, status, shift_instructions, staffing_ratio,
    note_required, note_completed, created_by, updated_by, updated_at
  ) values (
    roster_shift_id, actor_organisation_id, roster_participant_id, roster_title,
    roster_support_type, roster_location,
    (roster_shift_date + roster_start_time) at time zone 'Australia/Sydney',
    (roster_shift_date + roster_end_time) at time zone 'Australia/Sydney',
    'Australia/Sydney', lower(replace(roster_status, ' ', '_')),
    roster_shift_instructions, roster_staffing_ratio,
    coalesce(roster_note_required, true), coalesce(roster_note_completed, false),
    actor_id, actor_id, now()
  )
  on conflict (id) do update set
    participant_id = excluded.participant_id,
    title = excluded.title,
    support_type = excluded.support_type,
    location = excluded.location,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    timezone = excluded.timezone,
    status = excluded.status,
    shift_instructions = excluded.shift_instructions,
    staffing_ratio = excluded.staffing_ratio,
    note_required = excluded.note_required,
    note_completed = excluded.note_completed,
    updated_by = actor_id,
    updated_at = now()
  where public.support_shifts.organisation_id = actor_organisation_id;

  if not exists (
    select 1 from public.support_shifts
    where id = roster_shift_id
      and organisation_id = actor_organisation_id
  ) then
    raise exception 'The shift identifier is already used outside this organisation.' using errcode = '42501';
  end if;

  delete from public.shift_staff
  where shift_id = roster_shift_id
    and organisation_id = actor_organisation_id;

  for assignment in select value from jsonb_array_elements(roster_assignments)
  loop
    begin
      invite_id := (assignment ->> 'workerId')::uuid;
    exception when invalid_text_representation then
      raise exception 'Every assigned worker must have a valid workspace identifier.' using errcode = '22023';
    end;

    if not exists (
      select 1 from public.staff_invites
      where id = invite_id
        and organisation_id = actor_organisation_id
        and lower(invite_status) <> 'suspended'
    ) then
      raise exception 'An assigned worker is unavailable in this organisation.' using errcode = '42501';
    end if;

    select u.id
      into assigned_user_id
    from public.staff_invites si
    join public.users u
      on u.organisation_id = si.organisation_id
      and lower(u.email) = lower(si.email)
    where si.id = invite_id
      and si.organisation_id = actor_organisation_id
    limit 1;

    insert into public.shift_staff (
      organisation_id, shift_id, staff_user_id, staff_invite_id, role, status
    ) values (
      actor_organisation_id, roster_shift_id, assigned_user_id, invite_id,
      coalesce(nullif(assignment ->> 'role', ''), 'assigned worker'),
      case when lower(replace(roster_status, ' ', '_')) = 'completed' then 'completed' else 'assigned' end
    );
  end loop;

  return roster_shift_id;
end;
$$;

revoke all on function public.save_roster_shift_with_staff(uuid, uuid, text, text, text, date, time, time, text, text, text, boolean, boolean, jsonb) from public, anon;
grant execute on function public.save_roster_shift_with_staff(uuid, uuid, text, text, text, date, time, time, text, text, text, boolean, boolean, jsonb) to authenticated;

comment on function public.save_roster_shift_with_staff(uuid, uuid, text, text, text, date, time, time, text, text, text, boolean, boolean, jsonb) is
  'Atomically saves one organisation roster shift and its complete staff allocation.';
