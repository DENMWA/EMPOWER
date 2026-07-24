-- EmpowerNotes Supabase repair: stop recursive users RLS policies.
-- Run this on the Supabase project connected to Vercel.
-- It is safe to run more than once.

create or replace function current_user_profile()
returns users
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.users
  where id = auth.uid()
$$;

create or replace function current_user_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organisation_id
  from public.users
  where id = auth.uid()
$$;

create or replace function current_user_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role in ('team_leader','case_manager','service_manager','admin','owner','sole_provider')
  )
$$;

create or replace function current_user_is_roster_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role in ('admin','owner','sole_provider')
  )
$$;

create or replace function assigned_to_participant(participant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participant_assignments
    where participant_id = participant
      and user_id = auth.uid()
  )
$$;

grant execute on function current_user_profile() to authenticated;
grant execute on function current_user_organisation_id() to authenticated;
grant execute on function current_user_is_manager() to authenticated;
grant execute on function current_user_is_roster_admin() to authenticated;
grant execute on function assigned_to_participant(uuid) to authenticated;

drop policy if exists "users can view org users" on public.users;
drop policy if exists "users view own profile" on public.users;
drop policy if exists "users update own profile" on public.users;
drop policy if exists "managers manage org users" on public.users;
drop policy if exists "service role manages users" on public.users;

create policy "users can view org users"
on public.users
for select
using (
  id = auth.uid()
  or organisation_id = current_user_organisation_id()
);

create policy "users update own profile"
on public.users
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "managers manage org users"
on public.users
for all
using (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
)
with check (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);

drop policy if exists "users can view own organisation" on public.organisations;

create policy "users can view own organisation"
on public.organisations
for select
using (id = current_user_organisation_id());
