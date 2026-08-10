-- EmpowerNotes platform subscription payment ledger.
-- Written by the Stripe webhook through the service role and never exposed to tenant users.

create table if not exists public.platform_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  stripe_invoice_id text not null unique,
  stripe_event_id text,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null check (status in ('paid', 'failed', 'open', 'void', 'uncollectible')),
  currency text not null default 'aud',
  amount_due_cents bigint not null default 0 check (amount_due_cents >= 0),
  amount_paid_cents bigint not null default 0 check (amount_paid_cents >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  invoice_created_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  hosted_invoice_url text,
  invoice_pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_subscription_payments_org_date_idx
  on public.platform_subscription_payments (organisation_id, invoice_created_at desc);
create index if not exists platform_subscription_payments_status_date_idx
  on public.platform_subscription_payments (status, invoice_created_at desc);

alter table public.platform_subscription_payments enable row level security;
revoke all on public.platform_subscription_payments from anon, authenticated;

comment on table public.platform_subscription_payments is
  'Owner-only Stripe invoice ledger for EmpowerNotes SaaS subscriptions. Tenant users have no direct access.';

notify pgrst, 'reload schema';
