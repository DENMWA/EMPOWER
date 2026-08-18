-- EmpowerNotes controlled data-retention lifecycle.
-- Run after membership-authority-hardening.sql and privileged-mfa-rls.sql.
-- Additive only: this migration never deletes, de-identifies or rewrites customer records.

begin;

create table if not exists public.retention_schedules (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  record_class text not null check (record_class in ('care_records','incident_records','restrictive_practice_records','billing_records','document_records','workforce_records')),
  retention_years smallint not null check (retention_years between 1 and 30),
  proposed_action text not null default 'review' check (proposed_action in ('review','deidentify','delete')),
  status text not null default 'draft' check (status in ('draft','approved','paused')),
  basis text not null default '',
  basis_url text not null default '',
  approved_by uuid null references public.users(id) on delete set null,
  approved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, record_class)
);

create table if not exists public.legal_holds (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  participant_id uuid null references public.participants_or_clients(id) on delete restrict,
  record_class text null check (record_class is null or record_class in ('care_records','incident_records','restrictive_practice_records','billing_records','document_records','workforce_records')),
  reason text not null check (length(trim(reason)) >= 10),
  reference text not null default '',
  status text not null default 'active' check (status in ('active','released')),
  review_on date null,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  released_by uuid null references public.users(id) on delete set null,
  released_at timestamptz null,
  release_reason text not null default ''
);

create table if not exists public.retention_review_queue (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  participant_id uuid null references public.participants_or_clients(id) on delete restrict,
  record_class text not null check (record_class in ('care_records','incident_records','restrictive_practice_records','billing_records','document_records','workforce_records')),
  source_table text not null check (source_table in ('progress_notes','incident_reports','restrictive_practice_uses','native_invoices','documents','staff_invites')),
  source_record_id uuid not null,
  recorded_at timestamptz not null,
  eligible_at date not null,
  proposed_action text not null check (proposed_action in ('review','deidentify','delete')),
  status text not null default 'pending' check (status in ('pending','held','reviewed','approved','exempted','completed','failed')),
  legal_hold_id uuid null references public.legal_holds(id) on delete set null,
  review_reason text not null default '',
  reviewed_by uuid null references public.users(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, source_table, source_record_id)
);

create table if not exists public.retention_action_jobs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  candidate_id uuid not null references public.retention_review_queue(id) on delete restrict,
  requested_action text not null check (requested_action in ('deidentify','delete')),
  status text not null default 'approved' check (status in ('approved','processing','completed','failed','cancelled')),
  requested_by uuid not null references public.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  completed_at timestamptz null,
  failure_reason text not null default '',
  execution_reference text not null default '',
  unique (candidate_id)
);

create index if not exists idx_retention_schedules_org_status on public.retention_schedules (organisation_id, status, record_class);
create index if not exists idx_legal_holds_org_active on public.legal_holds (organisation_id, status, participant_id, record_class);
create index if not exists idx_retention_queue_org_status on public.retention_review_queue (organisation_id, status, eligible_at);
create index if not exists idx_retention_jobs_org_status on public.retention_action_jobs (organisation_id, status, requested_at);

insert into public.retention_schedules (organisation_id, record_class, retention_years, proposed_action, status, basis, basis_url)
select organisation.id, defaults.record_class, defaults.retention_years, 'review', 'draft', defaults.basis, defaults.basis_url
from public.organisations organisation
cross join (values
  ('incident_records', 7, 'NDIS incident records require a minimum seven-year period; confirm state and territory duties.', 'https://www.ndiscommission.gov.au/rules-and-standards/reportable-incidents-and-incident-management/incident-management'),
  ('restrictive_practice_records', 7, 'Restrictive-practice incident records may carry seven-year NDIS duties; confirm applicable authorisation law.', 'https://www.ndiscommission.gov.au/rules-and-standards/behaviour-support-and-restrictive-practices'),
  ('workforce_records', 7, 'Fair Work time and wage records are generally retained for seven years.', 'https://www.fairwork.gov.au/pay-and-wages/paying-wages/record-keeping'),
  ('billing_records', 5, 'NDIS payment evidence commonly carries a five-year record period; confirm provider and tax obligations.', 'https://www.ndis.gov.au/providers/working-provider/reporting-and-recording-keeping/what-are-record-keeping-requirements'),
  ('care_records', 7, 'Provider approval required after checking service, safeguarding, health and jurisdictional duties.', 'https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information'),
  ('document_records', 7, 'Provider approval required; individual document classes can carry different duties.', 'https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information')
) as defaults(record_class, retention_years, basis, basis_url)
on conflict (organisation_id, record_class) do nothing;

create or replace function private.seed_organisation_retention_schedules()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  insert into public.retention_schedules (organisation_id, record_class, retention_years, proposed_action, status, basis, basis_url)
  values
    (new.id, 'incident_records', 7, 'review', 'draft', 'NDIS incident records require a minimum seven-year period; confirm state and territory duties.', 'https://www.ndiscommission.gov.au/rules-and-standards/reportable-incidents-and-incident-management/incident-management'),
    (new.id, 'restrictive_practice_records', 7, 'review', 'draft', 'Restrictive-practice incident records may carry seven-year NDIS duties; confirm applicable authorisation law.', 'https://www.ndiscommission.gov.au/rules-and-standards/behaviour-support-and-restrictive-practices'),
    (new.id, 'workforce_records', 7, 'review', 'draft', 'Fair Work time and wage records are generally retained for seven years.', 'https://www.fairwork.gov.au/pay-and-wages/paying-wages/record-keeping'),
    (new.id, 'billing_records', 5, 'review', 'draft', 'NDIS payment evidence commonly carries a five-year record period; confirm provider and tax obligations.', 'https://www.ndis.gov.au/providers/working-provider/reporting-and-recording-keeping/what-are-record-keeping-requirements'),
    (new.id, 'care_records', 7, 'review', 'draft', 'Provider approval required after checking service, safeguarding, health and jurisdictional duties.', 'https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information'),
    (new.id, 'document_records', 7, 'review', 'draft', 'Provider approval required; individual document classes can carry different duties.', 'https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information')
  on conflict (organisation_id, record_class) do nothing;
  return new;
end;
$$;

drop trigger if exists seed_organisation_retention_schedules_trigger on public.organisations;
create trigger seed_organisation_retention_schedules_trigger
after insert on public.organisations
for each row execute function private.seed_organisation_retention_schedules();

create or replace function private.current_user_can_manage_retention()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1 from public.organisation_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.organisation_id = public.current_user_organisation_id()
      and membership.access_status = 'active'
      and membership.role::text in ('owner','admin','sole_provider')
  )
$$;

create or replace function private.prevent_held_retention_job()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  queued_record public.retention_review_queue%rowtype;
begin
  select * into queued_record from public.retention_review_queue where id = new.candidate_id and organisation_id = new.organisation_id;
  if queued_record.id is null then
    raise exception 'The retention candidate does not belong to this organisation.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.legal_holds hold
    where hold.organisation_id = new.organisation_id
      and hold.status = 'active'
      and (hold.participant_id is null or hold.participant_id = queued_record.participant_id)
      and (hold.record_class is null or hold.record_class = queued_record.record_class)
  ) then
    raise exception 'An active legal hold prevents this retention action.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_held_retention_job_trigger on public.retention_action_jobs;
create trigger prevent_held_retention_job_trigger
before insert or update on public.retention_action_jobs
for each row execute function private.prevent_held_retention_job();

alter table public.retention_schedules enable row level security;
alter table public.legal_holds enable row level security;
alter table public.retention_review_queue enable row level security;
alter table public.retention_action_jobs enable row level security;

do $$
declare target_table text;
begin
  foreach target_table in array array['retention_schedules','legal_holds','retention_review_queue','retention_action_jobs'] loop
    execute format('drop policy if exists "retention owners view lifecycle records" on public.%I', target_table);
    execute format(
      'create policy "retention owners view lifecycle records" on public.%I for select to authenticated using (organisation_id = public.current_user_organisation_id() and private.current_user_can_manage_retention() and private.current_session_satisfies_privileged_mfa())',
      target_table
    );
  end loop;
end
$$;

revoke all on public.retention_schedules, public.legal_holds, public.retention_review_queue, public.retention_action_jobs from anon, authenticated;
grant select on public.retention_schedules, public.legal_holds, public.retention_review_queue, public.retention_action_jobs to authenticated;
grant all on public.retention_schedules, public.legal_holds, public.retention_review_queue, public.retention_action_jobs to service_role;
revoke all on function private.current_user_can_manage_retention() from public, anon;
revoke all on function private.prevent_held_retention_job() from public, anon, authenticated;
revoke all on function private.seed_organisation_retention_schedules() from public, anon, authenticated;
grant execute on function private.current_user_can_manage_retention() to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
