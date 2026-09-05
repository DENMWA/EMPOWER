-- EmpowerNotes Stripe webhook event audit log.
-- Records every Stripe event the webhook handler receives, regardless of
-- outcome (processed, ignored, or errored), for auditability and so the
-- Developer platform console can report when the last event was received.
--
-- Written only by the webhook handler through the service role. Never
-- exposed to tenant users.
--
-- Safe to run more than once.

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  organisation_id uuid references public.organisations(id) on delete set null,
  outcome text not null check (outcome in ('processed', 'ignored', 'error')),
  error_detail text,
  received_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_received_at_idx
  on public.stripe_webhook_events (received_at desc);
create index if not exists stripe_webhook_events_outcome_idx
  on public.stripe_webhook_events (outcome, received_at desc);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;

comment on table public.stripe_webhook_events is
  'Owner-only audit log of every Stripe webhook event received, whether processed, ignored, or errored. Tenant users have no direct access.';

notify pgrst, 'reload schema';
