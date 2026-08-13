-- Run once in the Supabase SQL editor. Tenant invoice records are unchanged.
create table if not exists public.ndis_pricing_source_monitors (
  id text primary key, source_url text not null, last_checked_at timestamptz,
  page_checksum text, detected_download_url text, detected_filename text, detected_checksum text,
  status text not null default 'not_checked' check (status in ('not_checked','current','draft_ready','review_required','error')),
  alert_status text not null default 'none' check (alert_status in ('none','open','resolved')),
  detail text not null default '', draft_version_id uuid references public.ndis_pricing_versions(id) on delete set null,
  published_version_id uuid references public.ndis_pricing_versions(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.ndis_pricing_source_monitors enable row level security;
revoke all on public.ndis_pricing_source_monitors from anon, authenticated;
create index if not exists idx_ndis_pricing_versions_platform_status on public.ndis_pricing_versions(status,effective_from desc) where organisation_id is null;
select pg_notify('pgrst','reload schema');
