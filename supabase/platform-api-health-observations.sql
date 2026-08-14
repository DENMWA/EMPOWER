-- Server-only API availability observations for the developer console.

create table if not exists public.platform_api_health_observations (
  id uuid primary key default gen_random_uuid(),
  check_id text not null,
  check_name text not null,
  status text not null check (status in ('healthy', 'warning', 'critical')),
  available boolean not null,
  response_ms integer not null default 0 check (response_ms >= 0),
  detail text not null,
  checked_at timestamptz not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_api_health_check_time
  on public.platform_api_health_observations(check_id, checked_at desc);

alter table public.platform_api_health_observations enable row level security;
revoke all on public.platform_api_health_observations from anon, authenticated;
grant all on public.platform_api_health_observations to service_role;

comment on table public.platform_api_health_observations is
  'Server-written API availability metadata. Secret values and customer data are never stored.';
