-- EmpowerNotes membership-authority hardening.
-- Apply after organisation-invitations.sql and house-scoped-access.sql.
-- Additive and data preserving: users.organisation_id remains the active workspace
-- preference, but every helper verifies a matching active membership.

create index if not exists idx_org_memberships_user_org_status
  on public.organisation_memberships (user_id, organisation_id, access_status);

comment on column public.users.organisation_id is
  'Non-authoritative active workspace preference. Access requires an active organisation_memberships row.';
comment on column public.users.role is
  'Legacy display hint only. Server and RLS authorisation resolve role from organisation_memberships.';
comment on column public.users.admin_permissions is
  'Legacy display hint only. Server authorisation resolves permissions from organisation_memberships.';
comment on column public.users.feature_permissions is
  'Legacy display hint only. Server and RLS authorisation resolve permissions from organisation_memberships.';

create or replace function public.role_default_permissions(selected_role public.user_role)
returns text[] language sql immutable as $$
  select case selected_role::text
    when 'support_worker' then array['participants.view_basic','participants.view_support','notes.create','notes.view','incidents.create','meals.create','meals.view','handover.view','handover.create','rostering.view','documents.view']
    when 'team_leader' then array['participants.view_basic','participants.view_support','notes.create','notes.view','notes.review','incidents.create','incidents.view','meals.create','meals.view','handover.view','handover.create','rostering.view','documents.view','house.dashboard.view']
    when 'house_manager' then array['participants.view_basic','participants.view_support','participants.view_sensitive','notes.create','notes.view','notes.review','notes.approve','incidents.create','incidents.view','incidents.review','incidents.manage_followup','handover.view','handover.create','rostering.view','rostering.manage','rostering.assign_staff','staff.view','staff.assign_houses','documents.view','reports.view','house.dashboard.view']
    when 'service_manager' then array['participants.view_basic','participants.view_support','participants.view_sensitive','notes.create','notes.view','notes.review','notes.approve','incidents.create','incidents.view','incidents.review','incidents.manage_followup','handover.view','handover.create','rostering.view','rostering.manage','rostering.assign_staff','staff.view','documents.view','documents.manage','reports.view','reports.export','house.dashboard.view']
    when 'operations_manager' then array['participants.view_basic','participants.view_support','notes.view','notes.review','incidents.view','incidents.review','incidents.manage_followup','handover.view','rostering.view','rostering.manage','rostering.assign_staff','staff.view','staff.invite','staff.manage','staff.assign_houses','documents.view','reports.view','reports.export','house.dashboard.view','organisation.dashboard.view']
    when 'finance_officer' then array['participants.view_basic','billing.view','billing.manage','service_agreements.view','reports.view']
    when 'case_manager' then array['participants.view_basic','participants.view_support','participants.view_sensitive','notes.view','notes.review','incidents.view','incidents.review','documents.view','reports.view','house.dashboard.view']
    else array['participants.view_basic','participants.view_support','participants.view_sensitive','notes.create','notes.view','notes.review','notes.approve','incidents.create','incidents.view','incidents.review','incidents.manage_followup','meals.create','meals.view','handover.view','handover.create','rostering.view','rostering.manage','rostering.assign_staff','staff.view','staff.invite','staff.manage','staff.assign_houses','documents.view','documents.manage','billing.view','billing.manage','billing.approve','budgets.view','budgets.manage','house.dashboard.view','organisation.dashboard.view','service_agreements.view','service_agreements.manage','reports.view','reports.export','settings.view','settings.manage','organisation.settings.manage']
  end;
$$;

create or replace function public.current_user_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.organisation_id
  from public.users u
  join public.organisation_memberships om
    on om.user_id = u.id
   and om.organisation_id = u.organisation_id
   and om.access_status = 'active'
  where u.id = (select auth.uid())
  limit 1
$$;

create or replace function public.current_user_membership_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select om.role
  from public.organisation_memberships om
  where om.user_id = (select auth.uid())
    and om.organisation_id = public.current_user_organisation_id()
    and om.access_status = 'active'
  limit 1
$$;

create or replace function public.current_user_feature_permissions()
returns text[]
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select array_cat(
    case
      when om.role::text in ('owner','admin','sole_provider') then public.role_default_permissions(om.role)
      when cardinality(coalesce(om.feature_permissions, '{}'::text[])) > 0 then om.feature_permissions
      else public.role_default_permissions(om.role)
    end,
    case when 'team' = any(coalesce(om.admin_permissions, '{}'::text[]))
      then array['staff.view','staff.invite','staff.manage','staff.assign_houses'] else '{}'::text[] end
  )
  from public.organisation_memberships om
  where om.user_id = (select auth.uid())
    and om.organisation_id = public.current_user_organisation_id()
    and om.access_status = 'active'
  limit 1
$$;

create or replace function public.current_user_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.organisation_memberships om
    where om.user_id = (select auth.uid())
      and om.organisation_id = public.current_user_organisation_id()
      and om.access_status = 'active'
      and (om.role::text in ('team_leader','house_manager','case_manager','service_manager','operations_manager','admin','owner','sole_provider')
        or cardinality(coalesce(om.admin_permissions, '{}'::text[])) > 0)
  )
$$;

create or replace function public.current_user_is_roster_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.organisation_memberships om
    where om.user_id = (select auth.uid())
      and om.organisation_id = public.current_user_organisation_id()
      and om.access_status = 'active'
      and (om.role::text in ('admin','owner','sole_provider') or 'scheduling' = any(coalesce(om.admin_permissions, '{}'::text[])))
  )
$$;

create or replace function private.current_user_has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select requested_permission = any(coalesce(public.current_user_feature_permissions(), '{}'::text[]))
$$;

create or replace function private.current_user_can_access_house(requested_house_id text, access_date date default current_date)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.organisation_memberships om
    where om.user_id = (select auth.uid())
      and om.organisation_id = public.current_user_organisation_id()
      and om.access_status = 'active'
      and (
        om.role::text in ('owner','admin','sole_provider')
        or exists (
          select 1 from public.staff_house_assignments a
          where a.organisation_id = om.organisation_id
            and a.user_id = om.user_id
            and a.house_id = requested_house_id
            and a.status in ('active','scheduled')
            and a.start_date <= access_date
            and (a.end_date is null or a.end_date >= access_date)
        )
      )
  )
$$;

create or replace function private.current_user_can_access_participant(requested_participant_id uuid, access_date date default current_date)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.participants_or_clients p
    join public.organisation_memberships om
      on om.user_id = (select auth.uid())
     and om.organisation_id = p.organisation_id
     and om.access_status = 'active'
    where p.id = requested_participant_id
      and p.organisation_id = public.current_user_organisation_id()
      and (
        om.role::text in ('owner','admin','sole_provider')
        or exists (
          select 1 from public.participant_assignments pa
          where pa.organisation_id = p.organisation_id
            and pa.participant_id = p.id
            and pa.user_id = om.user_id
        )
        or exists (
          select 1 from public.participant_house_assignments pha
          where pha.organisation_id = p.organisation_id
            and pha.participant_id = p.id
            and pha.status in ('active','scheduled')
            and pha.start_date <= access_date
            and (pha.end_date is null or pha.end_date >= access_date)
            and private.current_user_can_access_house(pha.house_id, access_date)
        )
        or not exists (
          select 1 from public.service_locations h
          where h.organisation_id = p.organisation_id and h.status = 'active'
        )
      )
  )
$$;

create or replace function public.switch_active_organisation(requested_organisation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid := (select auth.uid());
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
    and access_status = 'active';
  if selected_membership.id is null then
    raise exception 'Active organisation membership is required.' using errcode = '42501';
  end if;

  select organisation_id into previous_organisation_id from public.users where id = actor_id for update;
  perform set_config('app.workspace_switch', 'true', true);
  update public.users
  set organisation_id = selected_membership.organisation_id
  where id = actor_id;

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

create or replace function public.protect_user_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid := (select auth.uid());
  workspace_switch boolean := coalesce(current_setting('app.workspace_switch', true), '') = 'true';
  actor_role public.user_role;
  actor_organisation_id uuid;
begin
  if actor_id is null then return new; end if;

  if workspace_switch then
    if new.id is distinct from old.id
      or new.email is distinct from old.email
      or new.provider_type is distinct from old.provider_type
      or new.role is distinct from old.role
      or new.admin_permissions is distinct from old.admin_permissions
      or new.feature_permissions is distinct from old.feature_permissions
      or new.access_status is distinct from old.access_status
      or not exists (
        select 1 from public.organisation_memberships om
        where om.user_id = actor_id and om.organisation_id = new.organisation_id and om.access_status = 'active'
      ) then
      raise exception 'Workspace switching may only select an active organisation membership.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.organisation_id is distinct from old.organisation_id
    or new.email is distinct from old.email
    or new.provider_type is distinct from old.provider_type then
    raise exception 'User identity and workspace fields cannot be changed from the client application.' using errcode = '42501';
  end if;
  if old.id = actor_id and (
    new.role is distinct from old.role
    or new.admin_permissions is distinct from old.admin_permissions
    or new.feature_permissions is distinct from old.feature_permissions
    or new.access_status is distinct from old.access_status
  ) then
    raise exception 'Users cannot change their own role or permissions.' using errcode = '42501';
  end if;
  if new.role is distinct from old.role
    or new.admin_permissions is distinct from old.admin_permissions
    or new.feature_permissions is distinct from old.feature_permissions
    or new.access_status is distinct from old.access_status then
    select om.role, om.organisation_id into actor_role, actor_organisation_id
    from public.organisation_memberships om
    where om.user_id = actor_id
      and om.organisation_id = public.current_user_organisation_id()
      and om.access_status = 'active';
    if actor_organisation_id is distinct from old.organisation_id
      or actor_role::text not in ('owner','admin','sole_provider')
      or (actor_role::text = 'admin' and (old.role::text = 'owner' or new.role::text = 'owner')) then
      raise exception 'Only an authorised owner or admin can change this user access.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop policy if exists "managers manage organisation house assignments" on public.staff_house_assignments;
create policy "authorised staff assign organisation houses"
on public.staff_house_assignments for all to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and private.current_user_has_permission('staff.assign_houses')
)
with check (
  organisation_id = public.current_user_organisation_id()
  and private.current_user_has_permission('staff.assign_houses')
);

drop policy if exists "managers manage participant locations" on public.participant_house_assignments;
create policy "authorised staff manage participant locations"
on public.participant_house_assignments for all to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and private.current_user_has_permission('staff.assign_houses')
)
with check (
  organisation_id = public.current_user_organisation_id()
  and private.current_user_has_permission('staff.assign_houses')
);

-- Keep onboarding atomic: every newly created workspace receives an owner
-- membership in the same transaction as its legacy profile pointer.
create or replace function public.create_organisation_for_current_user(
  organisation_name text,
  owner_name text,
  owner_email text,
  selected_provider_type public.provider_type default 'organisation'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid := (select auth.uid());
  new_organisation_id uuid;
  owner_role public.user_role;
begin
  if actor_id is null then raise exception 'You must be signed in to create an organisation.' using errcode = '42501'; end if;
  if exists (select 1 from public.users where id = actor_id) then
    select om.organisation_id into new_organisation_id
    from public.organisation_memberships om
    where om.user_id = actor_id and om.access_status = 'active'
    order by om.created_at asc
    limit 1;
    if new_organisation_id is null then raise exception 'The existing account has no active organisation membership.' using errcode = '42501'; end if;
    return new_organisation_id;
  end if;

  owner_role := case when selected_provider_type = 'sole_provider' then 'sole_provider'::public.user_role else 'owner'::public.user_role end;
  insert into public.organisations (name, provider_type, contact_email)
  values (organisation_name, selected_provider_type, owner_email)
  returning id into new_organisation_id;
  insert into public.users (id, organisation_id, name, email, role, provider_type)
  values (actor_id, new_organisation_id, owner_name, owner_email, owner_role, selected_provider_type);
  insert into public.organisation_memberships (organisation_id, user_id, role, access_status, permission_template_key)
  values (new_organisation_id, actor_id, owner_role, 'active', owner_role::text || '_default');
  insert into public.organisation_profiles (organisation_id, organisation_name, email, include_in_downloads)
  values (new_organisation_id, organisation_name, owner_email, true)
  on conflict (organisation_id) do update set
    organisation_name = excluded.organisation_name,
    email = excluded.email,
    include_in_downloads = true,
    updated_at = now();
  return new_organisation_id;
end;
$$;

revoke all on function public.current_user_organisation_id() from public, anon;
revoke all on function public.current_user_membership_role() from public, anon;
revoke all on function public.current_user_feature_permissions() from public, anon;
revoke all on function public.current_user_is_manager() from public, anon;
revoke all on function public.current_user_is_roster_admin() from public, anon;
revoke all on function public.switch_active_organisation(uuid) from public, anon;
revoke all on function public.create_organisation_for_current_user(text, text, text, public.provider_type) from public, anon;
grant execute on function public.current_user_organisation_id() to authenticated;
grant execute on function public.current_user_membership_role() to authenticated;
grant execute on function public.current_user_feature_permissions() to authenticated;
grant execute on function public.current_user_is_manager() to authenticated;
grant execute on function public.current_user_is_roster_admin() to authenticated;
grant execute on function public.switch_active_organisation(uuid) to authenticated;
grant execute on function public.create_organisation_for_current_user(text, text, text, public.provider_type) to authenticated;

select pg_notify('pgrst', 'reload schema');

-- Roll-forward: rerun this file after prerequisite migrations.
-- Rollback: restore the previous helper definitions; no table data or IDs are changed here.
