-- EmpowerNotes daily social content queue.
-- Stores one generated post per platform per day, rotating through the
-- public feature pages (lib/public-seo-pages.ts). LinkedIn personal-profile
-- posts can auto-publish (see lib/social-content.ts); other channels
-- (Instagram, LinkedIn company page) start as drafts for manual posting
-- until Meta/LinkedIn app review is complete for this account.
--
-- Written only by the social-content cron and the platform owner console,
-- both through the service role. Never exposed to tenant users.
--
-- Safe to run more than once.

create table if not exists public.social_media_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('linkedin', 'linkedin_page', 'instagram')),
  feature_slug text not null,
  content_text text not null,
  image_url text,
  status text not null default 'draft' check (status in ('draft', 'posted', 'failed')),
  external_post_id text,
  error_detail text,
  scheduled_for date not null,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (platform, scheduled_for)
);

create index if not exists social_media_posts_scheduled_idx
  on public.social_media_posts (scheduled_for desc);
create index if not exists social_media_posts_status_idx
  on public.social_media_posts (status, scheduled_for desc);

alter table public.social_media_posts enable row level security;
revoke all on public.social_media_posts from anon, authenticated;

comment on table public.social_media_posts is
  'Owner-only daily social content queue. Tenant users have no direct access.';

notify pgrst, 'reload schema';
