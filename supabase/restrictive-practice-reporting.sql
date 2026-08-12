-- Restrictive Practice Reporting: authorisations and individual use records.
-- Run in Supabase SQL Editor. Safe to run repeatedly.

alter table public.users drop constraint if exists users_admin_permissions_valid;
alter table public.users add constraint users_admin_permissions_valid check (admin_permissions <@ array[
  'incident_actioning','restrictive_practice_reporting','shift_verification','scheduling','people','team','billing','reports','documents','settings'
]::text[]);
alter table public.staff_invites drop constraint if exists staff_invites_admin_permissions_valid;
alter table public.staff_invites add constraint staff_invites_admin_permissions_valid check (admin_permissions <@ array[
  'incident_actioning','restrictive_practice_reporting','shift_verification','scheduling','people','team','billing','reports','documents','settings'
]::text[]);

create table if not exists public.restrictive_practice_authorisations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  participant_id uuid not null references public.participants_or_clients(id) on delete cascade,
  house_id uuid null,
  practice_type text not null check (practice_type in ('Seclusion','Chemical restraint','Mechanical restraint','Physical restraint','Environmental restraint')),
  practice_name text not null,
  behaviour_support_plan text not null default '', authorising_body text not null default '', authorisation_reference text not null,
  starts_on date not null, expires_on date not null, conditions text not null default '', maximum_duration_minutes integer null check (maximum_duration_minutes is null or maximum_duration_minutes > 0),
  maximum_frequency text not null default '', status text not null default 'Active' check (status in ('Active','Phasing out','Ceased','Suspended','Expired')),
  phase_out_target_date date null, ceased_on date null, cessation_reason text not null default '',
  approval_status text not null default 'Approved' check (approval_status in ('Approved','Unapproved')),
  created_by uuid not null default auth.uid() references public.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint restrictive_practice_authorisation_dates check (expires_on >= starts_on)
);
create index if not exists idx_rp_authorisations_org_participant on public.restrictive_practice_authorisations (organisation_id, participant_id, expires_on);

create table if not exists public.restrictive_practice_uses (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete cascade,
  authorisation_id uuid null references public.restrictive_practice_authorisations(id) on delete restrict,
  participant_id uuid not null references public.participants_or_clients(id) on delete restrict, house_id uuid null,
  practice_type text not null default 'Environmental restraint' check (practice_type in ('Seclusion','Chemical restraint','Mechanical restraint','Physical restraint','Environmental restraint')),
  used_at timestamptz not null, ended_at timestamptz null, trigger_context text not null default '', alternatives_attempted text not null default '',
  implementation text not null, participant_response text not null default '', monitoring text not null default '', recovery_support text not null default '',
  injury_or_harm boolean not null default false, injury_summary text not null default '', matched_authorisation boolean not null default true,
  approval_status text not null default 'Approved' check (approval_status in ('Approved','Unapproved')),
  variance_details text not null default '', staff_names text not null default '', notifications text not null default '',
  status text not null default 'Draft' check (status in ('Draft','Submitted','Reviewed')), linked_incident_id text null,
  recorded_by uuid not null default auth.uid() references public.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint restrictive_practice_use_times check (ended_at is null or ended_at >= used_at)
);
create index if not exists idx_rp_uses_org_month on public.restrictive_practice_uses (organisation_id, used_at desc);
create index if not exists idx_rp_uses_participant on public.restrictive_practice_uses (organisation_id, participant_id, used_at desc);

alter table public.restrictive_practice_authorisations add column if not exists approval_status text not null default 'Approved';
alter table public.restrictive_practice_authorisations add column if not exists phase_out_target_date date null;
alter table public.restrictive_practice_authorisations add column if not exists ceased_on date null;
alter table public.restrictive_practice_authorisations add column if not exists cessation_reason text not null default '';
alter table public.restrictive_practice_authorisations drop constraint if exists restrictive_practice_authorisations_status_check;
alter table public.restrictive_practice_authorisations add constraint restrictive_practice_authorisations_status_check check (status in ('Active','Phasing out','Ceased','Suspended','Expired'));
alter table public.restrictive_practice_authorisations drop constraint if exists restrictive_practice_authorisations_cessation_check;
alter table public.restrictive_practice_authorisations add constraint restrictive_practice_authorisations_cessation_check check (status <> 'Ceased' or (ceased_on is not null and length(trim(cessation_reason)) > 0));
alter table public.restrictive_practice_uses add column if not exists approval_status text not null default 'Approved';
alter table public.restrictive_practice_uses add column if not exists practice_type text not null default 'Environmental restraint';
alter table public.restrictive_practice_uses drop constraint if exists restrictive_practice_uses_practice_type_check;
alter table public.restrictive_practice_uses add constraint restrictive_practice_uses_practice_type_check check (practice_type in ('Seclusion','Chemical restraint','Mechanical restraint','Physical restraint','Environmental restraint'));
alter table public.restrictive_practice_authorisations drop constraint if exists restrictive_practice_authorisations_approval_status_check;
alter table public.restrictive_practice_authorisations add constraint restrictive_practice_authorisations_approval_status_check check (approval_status in ('Approved','Unapproved'));
alter table public.restrictive_practice_uses drop constraint if exists restrictive_practice_uses_approval_status_check;
alter table public.restrictive_practice_uses add constraint restrictive_practice_uses_approval_status_check check (approval_status in ('Approved','Unapproved'));

alter table public.restrictive_practice_authorisations enable row level security;
alter table public.restrictive_practice_uses enable row level security;

drop policy if exists "rp authorised users view authorisations" on public.restrictive_practice_authorisations;
create policy "rp authorised users view authorisations" on public.restrictive_practice_authorisations for select to authenticated
using (organisation_id = public.current_user_organisation_id() and (public.current_user_is_manager() or exists (select 1 from public.users u where u.id=auth.uid() and 'restrictive_practice_reporting'=any(coalesce(u.admin_permissions,'{}'::text[])))));
drop policy if exists "rp authorised users manage authorisations" on public.restrictive_practice_authorisations;
create policy "rp authorised users manage authorisations" on public.restrictive_practice_authorisations for all to authenticated
using (organisation_id = public.current_user_organisation_id() and (public.current_user_is_manager() or exists (select 1 from public.users u where u.id=auth.uid() and 'restrictive_practice_reporting'=any(coalesce(u.admin_permissions,'{}'::text[])))))
with check (organisation_id = public.current_user_organisation_id() and participant_id in (select p.id from public.participants_or_clients p where p.organisation_id=public.current_user_organisation_id()));

drop policy if exists "rp authorised users view use records" on public.restrictive_practice_uses;
create policy "rp authorised users view use records" on public.restrictive_practice_uses for select to authenticated
using (organisation_id = public.current_user_organisation_id() and (recorded_by=auth.uid() or public.current_user_is_manager() or exists (select 1 from public.users u where u.id=auth.uid() and 'restrictive_practice_reporting'=any(coalesce(u.admin_permissions,'{}'::text[])))));
drop policy if exists "rp authorised users create use records" on public.restrictive_practice_uses;
create policy "rp authorised users create use records" on public.restrictive_practice_uses for insert to authenticated
with check (organisation_id=public.current_user_organisation_id() and recorded_by=auth.uid() and participant_id in (select p.id from public.participants_or_clients p where p.organisation_id=public.current_user_organisation_id()) and (authorisation_id is null or authorisation_id in (select a.id from public.restrictive_practice_authorisations a where a.organisation_id=public.current_user_organisation_id() and a.participant_id=restrictive_practice_uses.participant_id)));
drop policy if exists "rp authorised users update use records" on public.restrictive_practice_uses;
create policy "rp authorised users update use records" on public.restrictive_practice_uses for update to authenticated
using (organisation_id=public.current_user_organisation_id() and (recorded_by=auth.uid() or public.current_user_is_manager() or exists (select 1 from public.users u where u.id=auth.uid() and 'restrictive_practice_reporting'=any(coalesce(u.admin_permissions,'{}'::text[])))))
with check (organisation_id=public.current_user_organisation_id());

grant select, insert, update on public.restrictive_practice_authorisations, public.restrictive_practice_uses to authenticated;
revoke delete on public.restrictive_practice_authorisations, public.restrictive_practice_uses from authenticated;
select pg_notify('pgrst','reload schema');
