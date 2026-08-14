-- Privacy-minimised NDIS invoice matching outcomes for platform quality reporting.

create table if not exists public.ndis_invoice_match_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  outcome text not null check (outcome in ('success', 'failure')),
  match_source text not null check (match_source in ('ai', 'rules', 'none')),
  failure_category text,
  selected_support_item_number text,
  selected_price numeric(12,2),
  confidence numeric(5,4),
  candidate_count integer not null default 0,
  occurred_at timestamptz not null default now(),
  check (
    (outcome = 'success' and selected_support_item_number is not null and selected_price > 0)
    or (outcome = 'failure' and selected_support_item_number is null)
  )
);

create index if not exists idx_ndis_invoice_match_events_occurred
  on public.ndis_invoice_match_events(occurred_at desc);
create index if not exists idx_ndis_invoice_match_events_org_occurred
  on public.ndis_invoice_match_events(organisation_id, occurred_at desc);

alter table public.ndis_invoice_match_events enable row level security;
revoke all on public.ndis_invoice_match_events from anon, authenticated;
grant all on public.ndis_invoice_match_events to service_role;

comment on table public.ndis_invoice_match_events is
  'Aggregate-quality telemetry for NDIS invoice matching. Contains no participant identity, service narrative or clinical content.';
