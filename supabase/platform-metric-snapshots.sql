-- Daily non-clinical metrics for the platform-owner visual console.

create table if not exists public.platform_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  subscription_tier text not null,
  subscription_status text not null,
  platform_access_status text not null default 'active',
  users_count integer not null default 0,
  clients_count integer not null default 0,
  houses_count integer not null default 0,
  incidents_count integer not null default 0,
  ai_notes_count integer not null default 0,
  documents_count integer not null default 0,
  invoice_lines_count integer not null default 0,
  storage_bytes bigint not null default 0,
  collected_revenue_cents bigint not null default 0,
  outstanding_revenue_cents bigint not null default 0,
  captured_at timestamptz not null default now(),
  unique (snapshot_date, organisation_id)
);

create index if not exists idx_platform_metric_snapshots_date
  on public.platform_metric_snapshots(snapshot_date desc);
create index if not exists idx_platform_metric_snapshots_org_date
  on public.platform_metric_snapshots(organisation_id, snapshot_date desc);

alter table public.platform_metric_snapshots enable row level security;
revoke all on public.platform_metric_snapshots from anon, authenticated;
grant all on public.platform_metric_snapshots to service_role;

comment on table public.platform_metric_snapshots is
  'Daily aggregate operational and commercial counts. Contains no participant names, notes, diagnoses or document content.';
