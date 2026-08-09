-- Aligns an existing incident_reports table with the current EmpowerNotes app.
-- Safe to run repeatedly. Existing incident data is retained.

create extension if not exists pgcrypto;

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.incident_reports
  add column if not exists participant_id uuid references public.participants_or_clients(id) on delete set null,
  add column if not exists app_incident_id text,
  add column if not exists app_participant_id text,
  add column if not exists house_id text,
  add column if not exists house_name text,
  add column if not exists participant_name text,
  add column if not exists reporter_name text,
  add column if not exists reported_by uuid,
  add column if not exists incident_date date,
  add column if not exists incident_time time,
  add column if not exists location text,
  add column if not exists status text not null default 'Draft',
  add column if not exists incident_types text[] not null default '{}',
  add column if not exists what_happened text,
  add column if not exists injury_harm_summary text,
  add column if not exists anyone_injured boolean not null default false,
  add column if not exists immediate_action_taken text,
  add column if not exists notification_notes text,
  add column if not exists follow_up_required boolean not null default false,
  add column if not exists follow_up_notes text,
  add column if not exists manager_comments text,
  add column if not exists manager_review_status text not null default 'Draft',
  add column if not exists property_damage jsonb not null default '{}'::jsonb,
  add column if not exists property_damage_involved boolean not null default false,
  add column if not exists property_damage_items text[] not null default '{}',
  add column if not exists property_damage_description text,
  add column if not exists property_damage_estimated_cost text,
  add column if not exists body_markers jsonb not null default '[]'::jsonb,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists incident_payload jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_incident_reports_org_app_incident_id
  on public.incident_reports (organisation_id, app_incident_id);

create index if not exists idx_incident_reports_org_participant_date
  on public.incident_reports (organisation_id, participant_id, incident_date desc);

alter table public.incident_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'incident_reports'
      and policyname = 'incident reports visible in own organisation'
  ) then
    create policy "incident reports visible in own organisation"
      on public.incident_reports for select to authenticated
      using (organisation_id = public.current_user_organisation_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'incident_reports'
      and policyname = 'users save incident reports in own organisation'
  ) then
    create policy "users save incident reports in own organisation"
      on public.incident_reports for insert to authenticated
      with check (organisation_id = public.current_user_organisation_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'incident_reports'
      and policyname = 'users update incident reports in own organisation'
  ) then
    create policy "users update incident reports in own organisation"
      on public.incident_reports for update to authenticated
      using (organisation_id = public.current_user_organisation_id())
      with check (organisation_id = public.current_user_organisation_id());
  end if;
end
$$;

grant select, insert, update on public.incident_reports to authenticated;

select pg_notify('pgrst', 'reload schema');

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'incident_reports'
  and column_name in (
    'app_incident_id',
    'app_participant_id',
    'participant_id',
    'house_id',
    'incident_payload',
    'body_markers'
  )
order by column_name;
