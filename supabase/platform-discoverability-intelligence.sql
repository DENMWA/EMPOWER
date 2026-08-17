-- Platform-owner discoverability metrics only. No tenant or participant content.
create table if not exists public.platform_discoverability_citations (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('chatgpt','google','gemini','copilot','perplexity','bing','other')),
  query_text text not null check (char_length(query_text) between 3 and 500),
  outcome text not null check (outcome in ('cited','mentioned','not_found')),
  cited_url text,
  position integer check (position is null or position > 0),
  notes text,
  checked_at timestamptz not null default now(),
  checked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_ai_crawler_events (
  id uuid primary key default gen_random_uuid(),
  crawler text not null,
  path text not null,
  response_status integer,
  occurred_at timestamptz not null default now()
);

create table if not exists public.platform_search_daily_metrics (
  metric_date date not null,
  source text not null check (source in ('google','bing')),
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  average_position numeric,
  indexed_pages integer,
  captured_at timestamptz not null default now(),
  primary key (metric_date, source)
);

create index if not exists platform_discoverability_citations_checked_idx on public.platform_discoverability_citations (checked_at desc);
create index if not exists platform_ai_crawler_events_time_idx on public.platform_ai_crawler_events (occurred_at desc, crawler);

alter table public.platform_discoverability_citations enable row level security;
alter table public.platform_ai_crawler_events enable row level security;
alter table public.platform_search_daily_metrics enable row level security;

revoke all on public.platform_discoverability_citations from anon, authenticated;
revoke all on public.platform_ai_crawler_events from anon, authenticated;
revoke all on public.platform_search_daily_metrics from anon, authenticated;

select pg_notify('pgrst', 'reload schema');
