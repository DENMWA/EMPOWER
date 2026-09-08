-- Lets staff members view and manage their own availability directly,
-- instead of requiring a manager to enter it on their behalf (via manual
-- form entry or scanned/handwritten form uploads, both slower and less
-- reliable than self-service).
--
-- A staff member can only ever read or write the availability row(s) tied
-- to their own staff_invites record (matched by authenticated email,
-- case-insensitive) — never another staff member's. Manager access is
-- unchanged.
--
-- Safe to run more than once.

drop policy if exists "staff view own availability" on public.staff_availability;
create policy "staff view own availability" on public.staff_availability for select to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and staff_invite_id in (
    select id from public.staff_invites
    where organisation_id = public.current_user_organisation_id()
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

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
  is_self boolean;
begin
  if actor_id is null or tenant_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.staff_invites
    where id = availability_staff_invite_id
      and organisation_id = tenant_id
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) into is_self;

  if not public.current_user_is_manager() and not is_self then
    raise exception 'You can only manage your own availability.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.staff_invites where id = availability_staff_invite_id and organisation_id = tenant_id and lower(invite_status) <> 'suspended') then
    raise exception 'The selected staff member is unavailable in this organisation.' using errcode = '42501';
  end if;

  insert into public.staff_availability (id, organisation_id, staff_invite_id, weekday, specific_date, start_time, end_time, availability_kind, recurring, notes, created_by, updated_at)
  values (availability_id, tenant_id, availability_staff_invite_id, availability_weekday, availability_specific_date, availability_start_time, availability_end_time, availability_kind, availability_recurring, availability_notes, actor_id, now())
  on conflict (id) do update set weekday = excluded.weekday, specific_date = excluded.specific_date, start_time = excluded.start_time, end_time = excluded.end_time, availability_kind = excluded.availability_kind, recurring = excluded.recurring, notes = excluded.notes, updated_at = now()
  where public.staff_availability.organisation_id = tenant_id;

  return availability_id;
end;
$$;

create or replace function public.delete_staff_availability(availability_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  tenant_id uuid := public.current_user_organisation_id();
  target_invite_id uuid;
  is_self boolean;
begin
  if actor_id is null or tenant_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select staff_invite_id into target_invite_id
  from public.staff_availability
  where id = availability_id and organisation_id = tenant_id;

  if target_invite_id is null then
    return;
  end if;

  select exists (
    select 1 from public.staff_invites
    where id = target_invite_id
      and organisation_id = tenant_id
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) into is_self;

  if not public.current_user_is_manager() and not is_self then
    raise exception 'You can only manage your own availability.' using errcode = '42501';
  end if;

  delete from public.staff_availability where id = availability_id and organisation_id = tenant_id;
end;
$$;

-- At most one recurring row per staff member per weekday. Existing
-- duplicate rows (if any) are collapsed to the most recently updated one
-- before the index is created, so the index creation itself never fails.
delete from public.staff_availability a
using public.staff_availability b
where a.specific_date is null and b.specific_date is null
  and a.staff_invite_id = b.staff_invite_id and a.weekday = b.weekday
  and a.updated_at < b.updated_at;

create unique index if not exists staff_availability_recurring_weekday_unique
  on public.staff_availability (staff_invite_id, weekday)
  where specific_date is null;

-- Bulk weekly-grid save: replaces a staff member's entire recurring
-- availability pattern (one row per weekday, at most) in a single call,
-- instead of requiring one round-trip per day via save_staff_availability.
-- Used by the new weekly grid editor (both the admin's per-staff editor
-- and the staff self-service page).
create or replace function public.save_weekly_availability_grid(
  target_staff_invite_id uuid,
  grid jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  tenant_id uuid := public.current_user_organisation_id();
  is_self boolean;
  entry jsonb;
  entry_weekday smallint;
  target_weekdays smallint[] := '{}';
begin
  if actor_id is null or tenant_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.staff_invites
    where id = target_staff_invite_id
      and organisation_id = tenant_id
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) into is_self;

  if not public.current_user_is_manager() and not is_self then
    raise exception 'You can only manage your own availability.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.staff_invites where id = target_staff_invite_id and organisation_id = tenant_id and lower(invite_status) <> 'suspended') then
    raise exception 'The selected staff member is unavailable in this organisation.' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(grid, '[]'::jsonb)) <> 'array' then
    raise exception 'Availability grid must be an array.' using errcode = '22023';
  end if;

  for entry in select value from jsonb_array_elements(coalesce(grid, '[]'::jsonb))
  loop
    entry_weekday := (entry ->> 'weekday')::smallint;
    if entry_weekday is null or entry_weekday < 0 or entry_weekday > 6 then
      raise exception 'Each entry must have a weekday between 0 and 6.' using errcode = '22023';
    end if;
    if (entry ->> 'kind') not in ('available', 'preferred', 'unavailable') then
      raise exception 'Each entry must have a valid availability kind.' using errcode = '22023';
    end if;
    if (entry ->> 'endTime')::time <= (entry ->> 'startTime')::time then
      raise exception 'End time must be later than start time for every day.' using errcode = '22023';
    end if;

    target_weekdays := array_append(target_weekdays, entry_weekday);

    insert into public.staff_availability (organisation_id, staff_invite_id, weekday, specific_date, start_time, end_time, availability_kind, recurring, notes, created_by, updated_at)
    values (tenant_id, target_staff_invite_id, entry_weekday, null, (entry ->> 'startTime')::time, (entry ->> 'endTime')::time, entry ->> 'kind', true, null, actor_id, now())
    on conflict (staff_invite_id, weekday) where specific_date is null
    do update set start_time = excluded.start_time, end_time = excluded.end_time, availability_kind = excluded.availability_kind, updated_at = now();
  end loop;

  delete from public.staff_availability
  where organisation_id = tenant_id
    and staff_invite_id = target_staff_invite_id
    and specific_date is null
    and (target_weekdays = '{}' or weekday <> all (target_weekdays));
end;
$$;

revoke all on function public.save_staff_availability(uuid, uuid, smallint, date, time, time, text, boolean, text) from public, anon;
grant execute on function public.save_staff_availability(uuid, uuid, smallint, date, time, time, text, boolean, text) to authenticated;
revoke all on function public.delete_staff_availability(uuid) from public, anon;
grant execute on function public.delete_staff_availability(uuid) to authenticated;
revoke all on function public.save_weekly_availability_grid(uuid, jsonb) from public, anon;
grant execute on function public.save_weekly_availability_grid(uuid, jsonb) to authenticated;
select pg_notify('pgrst', 'reload schema');
