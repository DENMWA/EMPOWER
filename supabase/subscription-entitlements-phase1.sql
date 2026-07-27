-- EmpowerNotes subscription entitlements Phase 1.
-- Run after schema.sql, fix-users-rls-recursion.sql and subscription-gating.sql.
-- Additive and monitor-only: this migration does not block any product action.

alter table public.organisations
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_grace_ends_at timestamptz,
  add column if not exists subscription_enforcement_mode text not null default 'monitor',
  add column if not exists plan_catalogue_version integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organisations_subscription_enforcement_mode_check'
      and conrelid = 'public.organisations'::regclass
  ) then
    alter table public.organisations
      add constraint organisations_subscription_enforcement_mode_check
      check (subscription_enforcement_mode in ('monitor', 'enforce'));
  end if;
end
$$;

create table if not exists public.organisation_usage (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  usage_period_start date not null,
  usage_period_end date not null,
  active_participants integer not null default 0,
  ai_analysed_notes integer not null default 0,
  plan_documents_processed integer not null default 0,
  storage_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, usage_period_start, usage_period_end)
);

alter table public.organisation_usage enable row level security;

drop policy if exists "organisation usage visible to managers" on public.organisation_usage;
create policy "organisation usage visible to managers"
on public.organisation_usage
for select using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

alter table public.organisation_usage
  add column if not exists active_users integer not null default 0,
  add column if not exists active_houses integer not null default 0,
  add column if not exists documents_uploaded integer not null default 0,
  add column if not exists invoice_lines integer not null default 0,
  add column if not exists active_service_agreements integer not null default 0;

create table if not exists public.entitlement_observations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  subscription_tier public.subscription_tier not null,
  resource text not null,
  action_name text not null,
  used_value bigint not null default 0,
  limit_value bigint,
  would_block boolean not null default false,
  enforcement_mode text not null default 'monitor',
  metadata jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now()
);

create index if not exists idx_entitlement_observations_org_time
  on public.entitlement_observations(organisation_id, observed_at desc);

create index if not exists idx_entitlement_observations_would_block
  on public.entitlement_observations(organisation_id, would_block, observed_at desc);

alter table public.entitlement_observations enable row level security;

drop policy if exists "managers view own entitlement observations" on public.entitlement_observations;
create policy "managers view own entitlement observations"
on public.entitlement_observations
for select using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

create or replace function public.current_organisation_enforcement_mode()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(o.subscription_enforcement_mode, 'monitor')
  from public.organisations o
  where o.id = public.current_user_organisation_id()
$$;

grant execute on function public.current_organisation_enforcement_mode() to authenticated;

comment on column public.organisations.subscription_enforcement_mode is
  'Monitor records entitlement decisions without blocking. Enforce may only be enabled after validation.';

comment on table public.entitlement_observations is
  'Server-written monitor and enforcement decisions. Authenticated clients receive read-only manager access.';
