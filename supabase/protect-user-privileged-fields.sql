-- EmpowerNotes security repair: protect user identity, tenancy, and roles.
-- Run after schema.sql and fix-users-rls-recursion.sql.
-- Safe to run more than once.

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
  -- SQL migrations and trusted server administration are not restricted by
  -- this client-facing guard. The service role is used by secure invite APIs.
  if actor_id is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  select u.role, u.organisation_id
    into actor_role, actor_organisation_id
  from public.users u
  where u.id = actor_id;

  if actor_role is null or actor_organisation_id is null then
    raise exception 'A verified organisation profile is required to update users.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.organisation_id is distinct from old.organisation_id
    or new.email is distinct from old.email
    or new.provider_type is distinct from old.provider_type then
    raise exception 'User identity and organisation fields cannot be changed from the client application.'
      using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    if old.id = actor_id then
      raise exception 'Users cannot change their own role.'
        using errcode = '42501';
    end if;

    if old.organisation_id is distinct from actor_organisation_id then
      raise exception 'Users can only manage roles inside their own organisation.'
        using errcode = '42501';
    end if;

    if actor_role = 'owner' then
      return new;
    end if;

    if actor_role = 'admin'
      and old.role <> 'owner'
      and new.role <> 'owner' then
      return new;
    end if;

    raise exception 'Only an authorised owner or admin can change this role.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_direct_user_deletion()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'User profiles cannot be deleted directly. Suspend access or use the secure account administration workflow.'
      using errcode = '42501';
  end if;

  return old;
end;
$$;

drop trigger if exists protect_user_privileged_fields_trigger on public.users;
create trigger protect_user_privileged_fields_trigger
before update on public.users
for each row
execute function public.protect_user_privileged_fields();

drop trigger if exists prevent_direct_user_deletion_trigger on public.users;
create trigger prevent_direct_user_deletion_trigger
before delete on public.users
for each row
execute function public.prevent_direct_user_deletion();

revoke all on function public.protect_user_privileged_fields() from public, anon, authenticated;
revoke all on function public.prevent_direct_user_deletion() from public, anon, authenticated;

comment on function public.protect_user_privileged_fields() is
  'Prevents authenticated clients from changing user identity, tenancy, provider type, or their own role.';

comment on function public.prevent_direct_user_deletion() is
  'Restricts user-profile deletion to trusted server and database administration paths.';
