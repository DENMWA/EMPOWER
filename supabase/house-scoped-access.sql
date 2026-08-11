-- EmpowerNotes additive house-scoped access model.
-- Run after organisation-invitations.sql and the existing core schema.

alter type public.user_role add value if not exists 'house_manager';
alter type public.user_role add value if not exists 'operations_manager';
alter type public.user_role add value if not exists 'finance_officer';

alter table public.users
  add column if not exists employment_type text not null default 'other',
  add column if not exists feature_permissions text[] not null default '{}',
  add column if not exists permission_template_key text;

alter table public.staff_invites
  add column if not exists employment_type text not null default 'other',
  add column if not exists feature_permissions text[] not null default '{}',
  add column if not exists permission_template_key text,
  add column if not exists assignment_start_date date,
  add column if not exists assignment_end_date date;

alter table public.organisation_invites
  add column if not exists employment_type text not null default 'other',
  add column if not exists feature_permissions text[] not null default '{}',
  add column if not exists permission_template_key text,
  add column if not exists assignment_start_date date,
  add column if not exists assignment_end_date date;

alter table public.organisation_memberships
  add column if not exists employment_type text not null default 'other',
  add column if not exists feature_permissions text[] not null default '{}',
  add column if not exists permission_template_key text;

insert into public.organisation_memberships (organisation_id, user_id, role, admin_permissions, employment_type, feature_permissions, permission_template_key, access_status)
select u.organisation_id, u.id, u.role, coalesce(u.admin_permissions, '{}'::text[]), coalesce(u.employment_type, 'other'), coalesce(u.feature_permissions, '{}'::text[]), coalesce(u.permission_template_key, u.role::text || '_default'), coalesce(u.access_status, 'active')
from public.users u
on conflict (organisation_id, user_id) do update set
  role = excluded.role,
  admin_permissions = excluded.admin_permissions,
  employment_type = excluded.employment_type,
  feature_permissions = excluded.feature_permissions,
  permission_template_key = excluded.permission_template_key,
  access_status = excluded.access_status,
  updated_at = now();

do $$ begin
  alter table public.users add constraint users_employment_type_valid
    check (employment_type in ('casual','permanent','part_time','contractor','other'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.staff_invites add constraint staff_invites_employment_type_valid
    check (employment_type in ('casual','permanent','part_time','contractor','other'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.staff_invites add constraint staff_invites_assignment_dates_valid
    check (assignment_end_date is null or assignment_start_date is null or assignment_end_date >= assignment_start_date);
exception when duplicate_object then null; end $$;

create table if not exists public.service_locations (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  id text not null,
  name text not null,
  address text,
  service_type text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organisation_id, id)
);

create table if not exists public.staff_house_assignments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  house_id text not null,
  start_date date not null default current_date,
  end_date date,
  status text not null default 'active' check (status in ('active','scheduled','ended','revoked')),
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assignment_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organisation_id, house_id) references public.service_locations(organisation_id, id) on delete restrict,
  check (end_date is null or end_date >= start_date)
);

create table if not exists public.participant_house_assignments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  participant_id uuid not null references public.participants_or_clients(id) on delete cascade,
  house_id text not null,
  assignment_type text not null default 'primary' check (assignment_type in ('primary','temporary','respite','community_program','other')),
  start_date date not null default current_date,
  end_date date,
  status text not null default 'active' check (status in ('active','scheduled','ended','cancelled')),
  assigned_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organisation_id, house_id) references public.service_locations(organisation_id, id) on delete restrict,
  check (end_date is null or end_date >= start_date)
);

create unique index if not exists staff_house_one_open_assignment
  on public.staff_house_assignments (organisation_id, user_id, house_id)
  where status in ('active','scheduled') and end_date is null;
create unique index if not exists participant_house_one_open_primary
  on public.participant_house_assignments (organisation_id, participant_id, house_id, assignment_type)
  where status in ('active','scheduled') and end_date is null;
create index if not exists staff_house_user_status_idx on public.staff_house_assignments (organisation_id, user_id, status, start_date, end_date);
create index if not exists staff_house_location_status_idx on public.staff_house_assignments (organisation_id, house_id, status, start_date, end_date);
create index if not exists participant_house_participant_status_idx on public.participant_house_assignments (organisation_id, participant_id, status, start_date, end_date);
create index if not exists participant_house_location_status_idx on public.participant_house_assignments (organisation_id, house_id, status, start_date, end_date);

create or replace function public.prevent_staff_house_assignment_overlap()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if new.status in ('active','scheduled') and exists (
    select 1 from public.staff_house_assignments a
    where a.organisation_id = new.organisation_id and a.user_id = new.user_id and a.house_id = new.house_id
      and a.id <> new.id and a.status in ('active','scheduled')
      and daterange(a.start_date, coalesce(a.end_date, 'infinity'::date), '[]') && daterange(new.start_date, coalesce(new.end_date, 'infinity'::date), '[]')
  ) then
    raise exception 'This staff member already has overlapping access to the selected house.' using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_staff_house_assignment_overlap on public.staff_house_assignments;
create trigger prevent_staff_house_assignment_overlap before insert or update of start_date, end_date, status, house_id, user_id
on public.staff_house_assignments for each row execute function public.prevent_staff_house_assignment_overlap();

-- Backfill the existing retained-record house model without deleting it.
insert into public.service_locations (organisation_id, id, name, address, service_type)
select r.organisation_id,
       (r.body::jsonb ->> 'id'),
       (r.body::jsonb ->> 'name'),
       nullif(r.body::jsonb ->> 'address', ''),
       nullif(r.body::jsonb ->> 'serviceType', '')
from public.retained_records r
where r.record_type = 'house-profile'
  and r.body is not null
  and r.body::jsonb ? 'id'
  and r.body::jsonb ? 'name'
on conflict (organisation_id, id) do update set
  name = excluded.name, address = excluded.address, service_type = excluded.service_type, updated_at = now();

insert into public.participant_house_assignments (organisation_id, participant_id, house_id, assignment_type, start_date, status, assigned_by)
select p.organisation_id, p.id, p.primary_house_id, 'primary', coalesce(p.created_at::date, current_date), 'active', null
from public.participants_or_clients p
join public.service_locations h on h.organisation_id = p.organisation_id and h.id = p.primary_house_id
where p.primary_house_id is not null
on conflict do nothing;

insert into public.staff_house_assignments (organisation_id, user_id, house_id, start_date, status, assigned_by, assignment_reason)
select si.organisation_id, u.id, house_id, coalesce(si.created_at::date, current_date), 'active', u.id, 'Backfilled from existing staff house access'
from public.staff_invites si
join public.users u on u.organisation_id = si.organisation_id and lower(u.email) = lower(si.email)
cross join lateral unnest(coalesce(si.assigned_house_ids, '{}'::text[])) house_id
join public.service_locations h on h.organisation_id = si.organisation_id and h.id = house_id
where lower(si.invite_status) not in ('suspended','draft')
on conflict do nothing;

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

create or replace function public.switch_active_organisation(requested_organisation_id uuid)
returns boolean language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare selected_membership public.organisation_memberships%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  select * into selected_membership from public.organisation_memberships
  where user_id = (select auth.uid()) and organisation_id = requested_organisation_id and access_status = 'active';
  if selected_membership.id is null then raise exception 'Active organisation membership is required.' using errcode = '42501'; end if;
  update public.users set
    organisation_id = selected_membership.organisation_id,
    role = selected_membership.role,
    admin_permissions = selected_membership.admin_permissions,
    employment_type = selected_membership.employment_type,
    feature_permissions = selected_membership.feature_permissions,
    permission_template_key = selected_membership.permission_template_key
  where id = (select auth.uid());
  return true;
end;
$$;
revoke all on function public.switch_active_organisation(uuid) from public, anon;
grant execute on function public.switch_active_organisation(uuid) to authenticated;

create or replace function public.current_user_feature_permissions()
returns text[] language sql stable security invoker set search_path = public, auth as $$
  select case when cardinality(coalesce(u.feature_permissions, '{}'::text[])) > 0
    then u.feature_permissions else public.role_default_permissions(u.role) end
  from public.users u where u.id = (select auth.uid()) limit 1;
$$;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.audit_house_assignment_change()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare action_name text; target_id uuid; audit_organisation_id uuid; audit_house_id text;
begin
  audit_organisation_id := coalesce(new.organisation_id, old.organisation_id);
  audit_house_id := coalesce(new.house_id, old.house_id);
  target_id := coalesce(new.id, old.id);
  if tg_table_name = 'staff_house_assignments' then
    action_name := case
      when tg_op = 'INSERT' and new.end_date is not null then 'temporary_house_access_created'
      when tg_op = 'INSERT' then 'staff_house_assigned'
      when new.status in ('ended','revoked') then 'staff_house_assignment_ended'
      else 'staff_house_assignment_updated' end;
  else
    action_name := case
      when tg_op = 'INSERT' then 'participant_house_assigned'
      when new.status in ('ended','cancelled') then 'participant_house_assignment_ended'
      else 'participant_house_moved' end;
  end if;
  insert into public.audit_logs (organisation_id, actor_id, action, entity_type, entity_id, metadata)
  values (audit_organisation_id, (select auth.uid()), action_name, tg_table_name, target_id,
    jsonb_build_object('house_id', audit_house_id, 'previous', case when tg_op = 'UPDATE' then to_jsonb(old) else null end, 'new', to_jsonb(new)));
  return new;
end;
$$;

drop trigger if exists audit_staff_house_assignment on public.staff_house_assignments;
create trigger audit_staff_house_assignment after insert or update on public.staff_house_assignments
for each row execute function private.audit_house_assignment_change();
drop trigger if exists audit_participant_house_assignment on public.participant_house_assignments;
create trigger audit_participant_house_assignment after insert or update on public.participant_house_assignments
for each row execute function private.audit_house_assignment_change();

create or replace function private.current_user_can_access_house(requested_house_id text, access_date date default current_date)
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and coalesce(u.access_status, 'active') = 'active'
      and (u.role in ('owner','admin','sole_provider') or exists (
        select 1 from public.staff_house_assignments a
        where a.organisation_id = u.organisation_id and a.user_id = u.id and a.house_id = requested_house_id
          and a.status in ('active','scheduled') and a.start_date <= access_date and (a.end_date is null or a.end_date >= access_date)
      ))
  );
$$;

create or replace function private.current_user_can_access_participant(requested_participant_id uuid, access_date date default current_date)
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1 from public.participants_or_clients p
    join public.users u on u.id = (select auth.uid()) and u.organisation_id = p.organisation_id
    where p.id = requested_participant_id and coalesce(u.access_status, 'active') = 'active'
      and (
        u.role in ('owner','admin','sole_provider')
        or exists (select 1 from public.participant_assignments pa where pa.participant_id = p.id and pa.user_id = u.id)
        or exists (
          select 1 from public.participant_house_assignments pha
          where pha.organisation_id = p.organisation_id and pha.participant_id = p.id
            and pha.status in ('active','scheduled') and pha.start_date <= access_date and (pha.end_date is null or pha.end_date >= access_date)
            and private.current_user_can_access_house(pha.house_id, access_date)
        )
        or not exists (select 1 from public.service_locations h where h.organisation_id = p.organisation_id and h.status = 'active')
      )
  );
$$;

create or replace function private.current_user_has_permission(requested_permission text)
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and coalesce(u.access_status, 'active') = 'active'
      and requested_permission = any(case when cardinality(coalesce(u.feature_permissions, '{}'::text[])) > 0
        then u.feature_permissions else public.role_default_permissions(u.role) end)
  );
$$;

create or replace function public.assigned_to_participant(participant uuid)
returns boolean language sql stable security invoker set search_path = public, auth as $$
  select private.current_user_can_access_participant(participant, current_date);
$$;

alter table public.service_locations enable row level security;
alter table public.staff_house_assignments enable row level security;
alter table public.participant_house_assignments enable row level security;

create policy "members view permitted service locations" on public.service_locations for select to authenticated
using (organisation_id = public.current_user_organisation_id() and private.current_user_can_access_house(id));
create policy "authorised managers maintain service locations" on public.service_locations for all to authenticated
using (organisation_id = public.current_user_organisation_id() and private.current_user_has_permission('staff.manage'))
with check (organisation_id = public.current_user_organisation_id() and private.current_user_has_permission('staff.manage'));
create policy "users view own house assignments" on public.staff_house_assignments for select to authenticated
using (organisation_id = public.current_user_organisation_id() and (user_id = (select auth.uid()) or public.current_user_is_manager()));
create policy "managers manage organisation house assignments" on public.staff_house_assignments for all to authenticated
using (organisation_id = public.current_user_organisation_id() and private.current_user_has_permission('staff.manage'))
with check (organisation_id = public.current_user_organisation_id() and private.current_user_has_permission('staff.manage'));
create policy "users view permitted participant locations" on public.participant_house_assignments for select to authenticated
using (organisation_id = public.current_user_organisation_id() and private.current_user_can_access_participant(participant_id));
create policy "managers manage participant locations" on public.participant_house_assignments for all to authenticated
using (organisation_id = public.current_user_organisation_id() and private.current_user_has_permission('staff.manage'))
with check (organisation_id = public.current_user_organisation_id() and private.current_user_has_permission('staff.manage'));

grant select, insert, update on public.service_locations to authenticated;
grant select on public.staff_house_assignments, public.participant_house_assignments to authenticated;
grant insert, update on public.staff_house_assignments, public.participant_house_assignments to authenticated;
grant execute on function public.role_default_permissions(public.user_role) to authenticated;
grant execute on function public.current_user_feature_permissions() to authenticated;
revoke all on function private.current_user_can_access_house(text, date) from public, anon;
revoke all on function private.current_user_can_access_participant(uuid, date) from public, anon;
revoke all on function private.current_user_has_permission(text) from public, anon;
grant execute on function private.current_user_can_access_house(text, date) to authenticated;
grant execute on function private.current_user_can_access_participant(uuid, date) to authenticated;
grant execute on function private.current_user_has_permission(text) to authenticated;

create or replace function public.validate_shift_staff_house_eligibility()
returns trigger language plpgsql security invoker set search_path = public, auth as $$
declare shift_day date; shift_house_id text;
begin
  select (s.start_time at time zone 'Australia/Sydney')::date, h.id
    into shift_day, shift_house_id
  from public.support_shifts s
  left join public.service_locations h
    on h.organisation_id = s.organisation_id
   and (h.id = s.location or lower(h.name) = lower(s.location))
  where s.id = new.shift_id and s.organisation_id = new.organisation_id;

  if exists (select 1 from public.service_locations where organisation_id = new.organisation_id and status = 'active') then
    if shift_house_id is null then
      raise exception 'Select a valid service location for this shift.' using errcode = '22023';
    end if;
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

drop trigger if exists shift_staff_house_eligibility on public.shift_staff;
create trigger shift_staff_house_eligibility before insert or update of staff_user_id, shift_id
on public.shift_staff for each row execute function public.validate_shift_staff_house_eligibility();

drop policy if exists "participant access by assignment or manager" on public.participants_or_clients;
create policy "participant access by active scope" on public.participants_or_clients for select to authenticated
using (organisation_id = public.current_user_organisation_id() and private.current_user_has_permission('participants.view_basic') and private.current_user_can_access_participant(id));

drop policy if exists "progress note access by assignment or manager" on public.progress_notes;
create policy "progress note access by active scope" on public.progress_notes for select to authenticated
using (organisation_id = public.current_user_organisation_id() and private.current_user_has_permission('notes.view') and (staff_id = (select auth.uid()) or private.current_user_can_access_participant(participant_id)));

drop policy if exists "workers create own notes for assigned participants" on public.progress_notes;
create policy "workers create notes in active scope" on public.progress_notes for insert to authenticated
with check (organisation_id = public.current_user_organisation_id() and staff_id = (select auth.uid()) and private.current_user_has_permission('notes.create') and private.current_user_can_access_participant(participant_id));

drop policy if exists "document access respects visibility" on public.documents;
create policy "document access respects feature and house scope" on public.documents for select to authenticated
using (organisation_id = public.current_user_organisation_id()
  and private.current_user_has_permission('documents.view')
  and private.current_user_can_access_participant(participant_id)
  and (visibility = 'worker-visible' or private.current_user_has_permission('participants.view_sensitive')));

drop policy if exists "org scoped incidents" on public.incidents;
create policy "incidents follow feature and house scope" on public.incidents for select to authenticated
using (organisation_id = public.current_user_organisation_id()
  and private.current_user_has_permission('incidents.view')
  and (staff_id = (select auth.uid()) or private.current_user_can_access_participant(participant_id)));

select pg_notify('pgrst', 'reload schema');
