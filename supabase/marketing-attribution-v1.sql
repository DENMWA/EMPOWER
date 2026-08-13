-- EmpowerNotes first-party marketing attribution. Run once in Supabase SQL Editor.
create table if not exists public.marketing_visitors (
 id uuid primary key default gen_random_uuid(), visitor_id uuid not null unique, user_id uuid references auth.users(id) on delete set null,
 organisation_id uuid references public.organisations(id) on delete set null, first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 first_utm_source text,first_utm_medium text,first_utm_campaign text,first_utm_content text,first_utm_term text,first_referrer text,first_landing_path text not null default '/',first_gclid text,first_oppref text,first_source_class text,
 latest_utm_source text,latest_utm_medium text,latest_utm_campaign text,latest_utm_content text,latest_utm_term text,latest_referrer text,latest_landing_path text,latest_gclid text,latest_oppref text,latest_source_class text,latest_touch_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.marketing_events (
 id uuid primary key default gen_random_uuid(),event_id text not null unique,visitor_id uuid not null,session_id uuid not null,user_id uuid references auth.users(id) on delete set null,organisation_id uuid references public.organisations(id) on delete set null,
 event_name text not null check(event_name in('page_view','feature_view','pricing_view','signup_started','signup_completed','subscription_started')),path text not null,utm_source text,utm_medium text,utm_campaign text,utm_content text,utm_term text,gclid text,oppref text,source_class text,metadata_json jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);
create table if not exists public.marketing_conversions (
 id uuid primary key default gen_random_uuid(),event_id text not null unique,visitor_id uuid not null,user_id uuid references auth.users(id) on delete set null,organisation_id uuid references public.organisations(id) on delete set null,
 conversion_type text not null check(conversion_type in('signup_completed','subscription_started')),first_touch_source text,latest_touch_source text,conversion_source_snapshot text,campaign text,gclid text,oppref text,
 openai_delivery_status text not null default 'disabled' check(openai_delivery_status in('not_applicable','pending','sent','failed','disabled')),google_delivery_status text not null default 'disabled' check(google_delivery_status in('not_applicable','pending','sent','failed','disabled')),openai_sent_at timestamptz,google_sent_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists idx_marketing_events_funnel on public.marketing_events(event_name,created_at desc);create index if not exists idx_marketing_events_source on public.marketing_events(source_class,created_at desc);create index if not exists idx_marketing_conversions_source on public.marketing_conversions(conversion_source_snapshot,created_at desc);
alter table public.marketing_visitors enable row level security;alter table public.marketing_events enable row level security;alter table public.marketing_conversions enable row level security;
revoke all on public.marketing_visitors from anon,authenticated;revoke all on public.marketing_events from anon,authenticated;revoke all on public.marketing_conversions from anon,authenticated;
select pg_notify('pgrst','reload schema');
