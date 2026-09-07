-- Fixes the same delete-then-insert bug in save_roster_shift_with_staff
-- (originally in supabase/roster-vacant-shifts.sql) that was already fixed
-- in the REST API route (app/api/roster/shifts/route.ts) via PR #2. This
-- RPC function is a separate code path used as a fallback by
-- lib/roster-cloud.ts whenever the primary API call fails at the network
-- level (fetch throws), and it still had the original bug: delete every
-- existing shift_staff row up front, then insert the new set. If any
-- assignment in the loop raised an exception (e.g. an invalid/unavailable
-- worker id), the whole function's work rolled back including the delete,
-- which is fine — but even a clean run left a real window where a
-- previously-assigned shift could end up with zero assignments if any
-- single assignment in the array failed validation, since the entire
-- previous assignment set was already gone before the loop started.
--
-- This version computes the diff first: only deletes rows that are no
-- longer wanted, and only after all new assignments have been validated
-- and inserted successfully.
--
-- Safe to run more than once.

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
  target_invite_ids uuid[] := '{}';
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select organisation_id
    into actor_organisation_id
  from public.users
  where id = actor_id
    and role in ('team_leader', 'house_manager', 'case_manager', 'service_manager', 'operations_manager', 'admin', 'owner', 'sole_provider');

  if actor_organisation_id is null then
    raise exception 'Roster management access is required.' using errcode = '42501';
  end if;

  if roster_shift_id is null or roster_participant_id is null then
    raise exception 'Shift and participant identifiers are required.' using errcode = '22023';
  end if;

  if roster_end_time <= roster_start_time then
    raise exception 'Shift end time must be later than start time.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(roster_assignments, '[]'::jsonb)) <> 'array' then
    raise exception 'Roster assignments must be an array.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.participants_or_clients
    where id = roster_participant_id
      and organisation_id = actor_organisation_id
  ) then
    raise exception 'The selected participant does not belong to this organisation.' using errcode = '42501';
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

  -- Validate every assignment and insert additions first, before removing
  -- anything. Any exception raised here rolls back the whole transaction
  -- (including the shift upsert above), so a bad assignment never leaves
  -- the shift half-saved.
  for assignment in select value from jsonb_array_elements(coalesce(roster_assignments, '[]'::jsonb))
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

    target_invite_ids := array_append(target_invite_ids, invite_id);

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
    )
    on conflict (shift_id, staff_invite_id) where staff_invite_id is not null do update set
      staff_user_id = excluded.staff_user_id,
      role = excluded.role,
      status = excluded.status;
  end loop;

  -- Only now remove assignments that are no longer wanted, after every
  -- new assignment has been validated and inserted successfully.
  delete from public.shift_staff
  where shift_id = roster_shift_id
    and organisation_id = actor_organisation_id
    and (staff_invite_id is null or staff_invite_id <> all (target_invite_ids));

  return roster_shift_id;
end;
$$;

revoke all on function public.save_roster_shift_with_staff(uuid, uuid, text, text, text, date, time, time, text, text, text, boolean, boolean, jsonb) from public, anon;
grant execute on function public.save_roster_shift_with_staff(uuid, uuid, text, text, text, date, time, time, text, text, text, boolean, boolean, jsonb) to authenticated;
select pg_notify('pgrst', 'reload schema');
