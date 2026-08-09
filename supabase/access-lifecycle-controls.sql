-- EmpowerNotes reversible staff and client lifecycle controls.
-- Run after admin-function-permissions.sql. Safe to run more than once.

alter table public.users
  add column if not exists access_status text not null default 'active';

alter table public.participants_or_clients
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_access_status_valid') then
    alter table public.users add constraint users_access_status_valid
      check (access_status in ('active', 'suspended'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'participants_status_valid') then
    alter table public.participants_or_clients add constraint participants_status_valid
      check (status in ('active', 'inactive'));
  end if;
end
$$;

-- Returning no organisation for suspended users causes existing tenant RLS
-- policies to deny access without deleting any historical records.
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
    and u.access_status = 'active'
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
    select 1 from public.users u
    where u.id = (select auth.uid())
      and u.organisation_id is not null
      and u.access_status = 'active'
      and u.role in ('team_leader', 'case_manager', 'service_manager', 'admin', 'owner', 'sole_provider')
  )
$$;

create or replace function public.current_user_is_roster_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and u.organisation_id is not null
      and u.access_status = 'active'
      and u.role in ('admin', 'owner', 'sole_provider')
  )
$$;

revoke all on function public.current_user_organisation_id() from public, anon;
revoke all on function public.current_user_is_manager() from public, anon;
revoke all on function public.current_user_is_roster_admin() from public, anon;
grant execute on function public.current_user_organisation_id() to authenticated;
grant execute on function public.current_user_is_manager() to authenticated;
grant execute on function public.current_user_is_roster_admin() to authenticated;

create or replace function public.protect_access_lifecycle_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role' then
    if tg_table_name = 'users' and new.access_status is distinct from old.access_status then
      raise exception 'Staff access status must be changed through the secure administration workflow.' using errcode = '42501';
    end if;
    if tg_table_name = 'participants_or_clients' and new.status is distinct from old.status then
      raise exception 'Client status must be changed through the secure administration workflow.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_user_access_status_trigger on public.users;
create trigger protect_user_access_status_trigger
before update on public.users
for each row execute function public.protect_access_lifecycle_fields();

drop trigger if exists protect_client_status_trigger on public.participants_or_clients;
create trigger protect_client_status_trigger
before update on public.participants_or_clients
for each row execute function public.protect_access_lifecycle_fields();

revoke all on function public.protect_access_lifecycle_fields() from public, anon, authenticated;

select pg_notify('pgrst', 'reload schema');

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'users' and column_name = 'access_status')
    or (table_name = 'participants_or_clients' and column_name = 'status'))
order by table_name;
