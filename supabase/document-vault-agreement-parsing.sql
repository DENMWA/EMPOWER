-- Stores AI-extracted agreement terms on the original private document.
-- Extracted terms remain a review draft until an authorised user approves them in Invoicing.
alter table public.documents
  add column if not exists billing_parse_status text,
  add column if not exists billing_parsed_terms jsonb,
  add column if not exists billing_parse_error text,
  add column if not exists billing_parsed_at timestamptz;

alter table public.documents drop constraint if exists documents_billing_parse_status_check;
alter table public.documents add constraint documents_billing_parse_status_check
  check (billing_parse_status is null or billing_parse_status in ('pending','processing','ready','failed'));

create index if not exists documents_billing_parse_status_idx
  on public.documents (organisation_id, participant_id, billing_parse_status)
  where billing_parse_status is not null;

notify pgrst, 'reload schema';
