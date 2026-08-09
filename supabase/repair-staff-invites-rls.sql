-- Repairs staff invitation RLS without weakening tenant isolation.
-- Safe to run repeatedly in the connected Supabase project.

create or replace function public.current_user_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.organisation_id
  from public.users u
  where u.id = (select auth.uid())
  limit 1
$$;

create or replace function public.current_user_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.organisation_id is not null
      and u.role in ('team_leader', 'case_manager', 'service_manager', 'admin', 'owner', 'sole_provider')
  )
$$;

revoke all on function public.current_user_organisation_id() from public;
revoke all on function public.current_user_organisation_id() from anon;
revoke all on function public.current_user_is_manager() from public;
revoke all on function public.current_user_is_manager() from anon;
grant execute on function public.current_user_organisation_id() to authenticated;
grant execute on function public.current_user_is_manager() to authenticated;

alter table public.staff_invites enable row level security;

drop policy if exists "managers manage staff invites" on public.staff_invites;
drop policy if exists "managers view organisation staff invites" on public.staff_invites;
drop policy if exists "managers create organisation staff invites" on public.staff_invites;
drop policy if exists "managers update organisation staff invites" on public.staff_invites;
drop policy if exists "managers delete organisation staff invites" on public.staff_invites;

create policy "managers view organisation staff invites"
on public.staff_invites
for select
to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

create policy "managers create organisation staff invites"
on public.staff_invites
for insert
to authenticated
with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

create policy "managers update organisation staff invites"
on public.staff_invites
for update
to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
)
with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

create policy "managers delete organisation staff invites"
on public.staff_invites
for delete
to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

grant select, insert, update, delete on public.staff_invites to authenticated;

select pg_notify('pgrst', 'reload schema');
