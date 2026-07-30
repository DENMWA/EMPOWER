-- Adds Australian invoice details without changing existing records.
-- Run in the Supabase SQL Editor for the project connected to Vercel.

alter table public.organisation_profiles
  add column if not exists abn text,
  add column if not exists payment_instructions text,
  add column if not exists payment_terms text default 'Payment due within 14 days.';

alter table public.participants_or_clients
  add column if not exists ndis_number text;

alter table public.native_invoices
  add column if not exists participant_ndis_number text;

notify pgrst, 'reload schema';
