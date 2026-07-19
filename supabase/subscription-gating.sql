-- EmpowerNotes subscription gating foundation.
-- Run this after schema.sql and saas-upgrade.sql.
-- This prepares Supabase to become the source of truth for Solo, Practice, Provider, and Enterprise access.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_tier') then
    create type subscription_tier as enum ('solo', 'practice', 'provider', 'enterprise');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'suspended');
  end if;
end;
$$;

alter table organisations add column if not exists subscription_tier subscription_tier not null default 'practice';
alter table organisations add column if not exists subscription_status subscription_status not null default 'trialing';
alter table organisations add column if not exists stripe_customer_id text;
alter table organisations add column if not exists stripe_subscription_id text;
alter table organisations add column if not exists subscription_current_period_end timestamptz;
alter table organisations add column if not exists access_paused_reason text;

create table if not exists organisation_usage_counters (
  organisation_id uuid primary key references organisations(id) on delete cascade,
  active_participants integer not null default 0,
  active_users integer not null default 0,
  ai_notes_this_month integer not null default 0,
  plan_uploads_this_month integer not null default 0,
  storage_bytes bigint not null default 0,
  usage_month date not null default date_trunc('month', now())::date,
  updated_at timestamptz not null default now()
);

alter table organisation_usage_counters enable row level security;

create or replace function current_organisation_subscription_tier()
returns subscription_tier
language sql
stable
as $$
  select coalesce(o.subscription_tier, 'practice'::subscription_tier)
  from organisations o
  where o.id = current_user_organisation_id()
$$;

create or replace function current_organisation_subscription_status()
returns subscription_status
language sql
stable
as $$
  select coalesce(o.subscription_status, 'trialing'::subscription_status)
  from organisations o
  where o.id = current_user_organisation_id()
$$;

create or replace function current_organisation_access_allowed()
returns boolean
language sql
stable
as $$
  select current_organisation_subscription_status() in ('trialing', 'active')
$$;

create or replace function current_organisation_usage()
returns organisation_usage_counters
language sql
stable
as $$
  select *
  from organisation_usage_counters
  where organisation_id = current_user_organisation_id()
$$;

grant execute on function current_organisation_subscription_tier() to authenticated;
grant execute on function current_organisation_subscription_status() to authenticated;
grant execute on function current_organisation_access_allowed() to authenticated;
grant execute on function current_organisation_usage() to authenticated;

create index if not exists idx_organisations_subscription_tier on organisations(subscription_tier);
create index if not exists idx_organisations_stripe_customer_id on organisations(stripe_customer_id);
create index if not exists idx_organisations_stripe_subscription_id on organisations(stripe_subscription_id);

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisation_usage_counters' and policyname = 'users view own organisation usage') then
    create policy "users view own organisation usage" on organisation_usage_counters for select using (
      organisation_id = current_user_organisation_id()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisation_usage_counters' and policyname = 'admins update own organisation usage') then
    create policy "admins update own organisation usage" on organisation_usage_counters for update using (
      organisation_id = current_user_organisation_id() and current_user_is_manager()
    ) with check (
      organisation_id = current_user_organisation_id() and current_user_is_manager()
    );
  end if;
end;
$$;

-- Stripe webhooks should update organisations.subscription_tier and organisations.subscription_status.
-- App/API enforcement should read this tier before allowing gated actions.
