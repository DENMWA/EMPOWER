-- EmpowerNotes delegated admin function permissions.
-- Safe to run more than once in the Supabase SQL editor.

alter table public.users
  add column if not exists admin_permissions text[] not null default '{}';

alter table public.staff_invites
  add column if not exists admin_permissions text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_admin_permissions_valid'
  ) then
    alter table public.users add constraint users_admin_permissions_valid
      check (admin_permissions <@ array[
        'incident_actioning', 'shift_verification', 'scheduling', 'people',
        'team', 'billing', 'reports', 'documents', 'settings'
      ]::text[]);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'staff_invites_admin_permissions_valid'
  ) then
    alter table public.staff_invites add constraint staff_invites_admin_permissions_valid
      check (admin_permissions <@ array[
        'incident_actioning', 'shift_verification', 'scheduling', 'people',
        'team', 'billing', 'reports', 'documents', 'settings'
      ]::text[]);
  end if;
end
$$;

create or replace function public.protect_user_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.user_role;
  actor_organisation_id uuid;
begin
  if actor_id is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  select u.role, u.organisation_id into actor_role, actor_organisation_id
  from public.users u where u.id = actor_id;

  if actor_role is null or actor_organisation_id is null then
    raise exception 'A verified organisation profile is required to update users.' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.organisation_id is distinct from old.organisation_id
    or new.email is distinct from old.email
    or new.provider_type is distinct from old.provider_type then
    raise exception 'User identity and organisation fields cannot be changed from the client application.' using errcode = '42501';
  end if;

  if new.role is distinct from old.role or new.admin_permissions is distinct from old.admin_permissions then
    if old.id = actor_id then
      raise exception 'Users cannot change their own role or admin permissions.' using errcode = '42501';
    end if;
    if old.organisation_id is distinct from actor_organisation_id then
      raise exception 'Users can only manage access inside their own organisation.' using errcode = '42501';
    end if;
    if actor_role = 'owner' then return new; end if;
    if actor_role = 'admin' and old.role <> 'owner' and new.role <> 'owner' then return new; end if;
    raise exception 'Only an authorised owner or admin can change role or function access.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_user_privileged_fields() from public, anon, authenticated;
select pg_notify('pgrst', 'reload schema');

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('users', 'staff_invites')
  and column_name = 'admin_permissions'
order by table_name;
