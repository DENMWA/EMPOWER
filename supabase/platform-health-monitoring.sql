-- EmpowerNotes platform health incident history.
-- Run once in the Supabase SQL Editor for the production project.

create table if not exists public.platform_health_incidents (
  id uuid primary key default gen_random_uuid(),
  check_id text not null,
  check_name text not null,
  severity text not null check (severity in ('warning', 'critical')),
  detail text not null,
  source text not null default 'scheduled-monitor',
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  occurrence_count integer not null default 1 check (occurrence_count > 0)
);

create unique index if not exists platform_health_one_active_issue_per_check
  on public.platform_health_incidents (check_id)
  where resolved_at is null;

create index if not exists platform_health_recent_events
  on public.platform_health_incidents (last_detected_at desc);

alter table public.platform_health_incidents enable row level security;
revoke all on table public.platform_health_incidents from anon, authenticated;

comment on table public.platform_health_incidents is
  'Platform-owner technical health incidents written only by the server-side scheduled monitor.';
