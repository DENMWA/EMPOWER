-- EmpowerNotes production platform operations console.
-- Additive migration: run after schema.sql and membership-authority-hardening.sql.

alter table public.organisations
  add column if not exists platform_access_status text not null default 'active',
  add column if not exists platform_access_reason text,
  add column if not exists platform_access_updated_at timestamptz,
  add column if not exists platform_access_updated_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organisations_platform_access_status_check'
      and conrelid = 'public.organisations'::regclass
  ) then
    alter table public.organisations
      add constraint organisations_platform_access_status_check
      check (platform_access_status in ('active', 'payment_risk', 'suspended', 'locked_review', 'cancelled'));
  end if;
end
$$;

create table if not exists public.platform_security_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  summary text not null,
  endpoint text,
  correlation_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_platform_security_events_time
  on public.platform_security_events(occurred_at desc);
create index if not exists idx_platform_security_events_org_time
  on public.platform_security_events(organisation_id, occurred_at desc);

create table if not exists public.platform_support_cases (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete set null,
  submitted_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null,
  category text not null default 'general',
  severity text not null default 'normal' check (severity in ('low', 'normal', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'investigating', 'waiting', 'resolved', 'closed')),
  page_path text,
  browser text,
  deployment_id text,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_platform_support_cases_status_time
  on public.platform_support_cases(status, created_at desc);
create index if not exists idx_platform_support_cases_org_time
  on public.platform_support_cases(organisation_id, created_at desc);

alter table public.platform_security_events enable row level security;
alter table public.platform_support_cases enable row level security;

-- These are platform-owner records. They are accessed only by owner-verified
-- server routes using the service role and are intentionally unavailable via
-- authenticated/anonymous Data API roles.
revoke all on public.platform_security_events from anon, authenticated;
revoke all on public.platform_support_cases from anon, authenticated;
grant all on public.platform_security_events to service_role;
grant all on public.platform_support_cases to service_role;

comment on table public.platform_security_events is
  'Non-clinical platform security and access events visible only to the verified platform owner.';
comment on table public.platform_support_cases is
  'Customer-reported operational issues. Never stores progress-note or participant clinical content.';
