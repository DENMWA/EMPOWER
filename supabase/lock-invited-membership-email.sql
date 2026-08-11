-- Lock invited organisation memberships to the email selected by the administrator.
-- Owner-created memberships remain valid because invited_email is null for those rows.

alter table public.organisation_memberships
  add column if not exists invited_email text;

update public.organisation_memberships membership
set invited_email = lower(trim(invitation.email))
from public.organisation_invites invitation
where invitation.organisation_id = membership.organisation_id
  and invitation.auth_user_id = membership.user_id
  and invitation.status = 'accepted'
  and membership.invited_email is null;

create index if not exists organisation_memberships_invited_email_idx
  on public.organisation_memberships (user_id, organisation_id, lower(invited_email))
  where invited_email is not null;

create or replace function public.current_user_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select profile.organisation_id
  from public.users profile
  join public.organisation_memberships membership
    on membership.user_id = profile.id
   and membership.organisation_id = profile.organisation_id
   and membership.access_status = 'active'
   and (
     membership.invited_email is null
     or lower(trim(membership.invited_email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
   )
  where profile.id = (select auth.uid())
  limit 1
$$;

create or replace function public.switch_active_organisation(requested_organisation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  previous_organisation_id uuid;
  selected_membership public.organisation_memberships%rowtype;
  correlation_id uuid := gen_random_uuid();
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into selected_membership
  from public.organisation_memberships
  where user_id = actor_id
    and organisation_id = requested_organisation_id
    and access_status = 'active'
    and (invited_email is null or lower(trim(invited_email)) = actor_email);
  if selected_membership.id is null then
    raise exception 'Active organisation membership for this email is required.' using errcode = '42501';
  end if;

  select organisation_id into previous_organisation_id from public.users where id = actor_id for update;
  perform set_config('app.workspace_switch', 'true', true);
  update public.users set organisation_id = selected_membership.organisation_id where id = actor_id;

  if previous_organisation_id is distinct from selected_membership.organisation_id then
    insert into public.audit_logs (organisation_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      selected_membership.organisation_id,
      actor_id,
      'organisation_workspace_switched',
      'organisation',
      selected_membership.organisation_id,
      jsonb_build_object('previous_organisation_id', previous_organisation_id, 'correlation_id', correlation_id)
    );
  end if;
  return true;
end;
$$;

revoke all on function public.current_user_organisation_id() from public, anon;
revoke all on function public.switch_active_organisation(uuid) from public, anon;
grant execute on function public.current_user_organisation_id() to authenticated;
grant execute on function public.switch_active_organisation(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
