-- Fixes validate_shift_staff_house_eligibility() (originally in
-- supabase/house-scoped-access.sql), which was blocking every roster
-- assignment across the whole organisation, silently, the moment a single
-- active service location ("house") was configured — even for shifts using
-- generic, non-house location labels like "Community" or "Client home"
-- that were never meant to be house-scoped.
--
-- Root cause: the trigger gated on "does this organisation have any active
-- service location at all", then tried to match the shift's free-text
-- location string against a service_locations name/id. Generic labels like
-- "Community" essentially never match, so shift_house_id resolved to null
-- and every such assignment was rejected with 'Select a valid service
-- location for this shift.' — regardless of whether that shift was ever
-- intended to be house-scoped.
--
-- Fix: only enforce house-eligibility for a shift that is *itself*
-- explicitly tied to a real service location (support_shifts.service_location_id
-- is not null), using that column directly instead of fuzzy string
-- matching. Shifts using a generic location label are exempt, matching
-- what the roster form has always offered as valid location choices.
--
-- Safe to run more than once.

create or replace function public.validate_shift_staff_house_eligibility()
returns trigger language plpgsql security invoker set search_path = public, auth as $$
declare shift_day date; shift_house_id text;
begin
  select (s.start_time at time zone 'Australia/Sydney')::date, s.service_location_id
    into shift_day, shift_house_id
  from public.support_shifts s
  where s.id = new.shift_id and s.organisation_id = new.organisation_id;

  -- Only shifts explicitly assigned to a real, active service location are
  -- house-scoped. Shifts using a generic location label (Community, Client
  -- home, Appointment location, Respite setting, or free-text "Other") are
  -- never subject to this check, regardless of how many service locations
  -- the organisation has configured elsewhere.
  if shift_house_id is not null and exists (
    select 1 from public.service_locations
    where id = shift_house_id and organisation_id = new.organisation_id and status = 'active'
  ) then
    if not exists (
      select 1 from public.staff_house_assignments a
      where a.organisation_id = new.organisation_id and a.user_id = new.staff_user_id and a.house_id = shift_house_id
        and a.status in ('active','scheduled') and a.start_date <= shift_day and (a.end_date is null or a.end_date >= shift_day)
    ) then
      raise exception 'The selected worker is not assigned to this house on the shift date.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

select pg_notify('pgrst', 'reload schema');
