-- Makes service-agreement and invoice bundle saves atomic.
-- Run after scheduling-native-invoicing.sql and the core SaaS/RLS schema.
-- Safe to run repeatedly.

create or replace function public.sync_service_agreement_bundle(
  agreement_rows jsonb,
  agreement_item_rows jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  tenant_id uuid := public.current_user_organisation_id();
begin
  if tenant_id is null or not public.current_user_can_manage_billing() then
    raise exception 'Billing access is required.' using errcode = '42501';
  end if;

  if exists (
    select 1 from jsonb_array_elements(coalesce(agreement_rows, '[]'::jsonb)) row_data
    where (row_data->>'organisation_id')::uuid is distinct from tenant_id
  ) or exists (
    select 1 from jsonb_array_elements(coalesce(agreement_item_rows, '[]'::jsonb)) row_data
    where (row_data->>'organisation_id')::uuid is distinct from tenant_id
  ) then
    raise exception 'Cross-organisation billing data is not permitted.' using errcode = '42501';
  end if;

  insert into public.service_agreements (
    id, organisation_id, participant_id, agreement_name, start_date, end_date,
    billing_frequency, invoice_recipient_type, invoice_recipient_name,
    invoice_recipient_email, plan_manager_name, plan_manager_email, status,
    created_by, created_at
  )
  select * from jsonb_to_recordset(coalesce(agreement_rows, '[]'::jsonb)) as row_data(
    id uuid, organisation_id uuid, participant_id uuid, agreement_name text,
    start_date date, end_date date, billing_frequency text,
    invoice_recipient_type text, invoice_recipient_name text,
    invoice_recipient_email text, plan_manager_name text, plan_manager_email text,
    status text, created_by uuid, created_at timestamptz
  )
  on conflict (id) do update set
    participant_id = excluded.participant_id,
    agreement_name = excluded.agreement_name,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    billing_frequency = excluded.billing_frequency,
    invoice_recipient_type = excluded.invoice_recipient_type,
    invoice_recipient_name = excluded.invoice_recipient_name,
    invoice_recipient_email = excluded.invoice_recipient_email,
    plan_manager_name = excluded.plan_manager_name,
    plan_manager_email = excluded.plan_manager_email,
    status = excluded.status,
    updated_at = now();

  insert into public.service_agreement_items (
    id, organisation_id, service_agreement_id, participant_id,
    ndis_support_item_id, pricing_version_id, support_item_number,
    support_item_name, agreed_rate, ndis_price_limit, unit_type,
    budget_category, budget_allocated, allow_travel, allow_kilometres,
    allow_non_face_to_face, allow_cancellations, status
  )
  select * from jsonb_to_recordset(coalesce(agreement_item_rows, '[]'::jsonb)) as row_data(
    id uuid, organisation_id uuid, service_agreement_id uuid,
    participant_id uuid, ndis_support_item_id uuid, pricing_version_id uuid,
    support_item_number text, support_item_name text, agreed_rate numeric,
    ndis_price_limit numeric, unit_type text, budget_category text,
    budget_allocated numeric, allow_travel boolean, allow_kilometres boolean,
    allow_non_face_to_face boolean, allow_cancellations boolean, status text
  )
  on conflict (id) do update set
    service_agreement_id = excluded.service_agreement_id,
    participant_id = excluded.participant_id,
    ndis_support_item_id = excluded.ndis_support_item_id,
    pricing_version_id = excluded.pricing_version_id,
    support_item_number = excluded.support_item_number,
    support_item_name = excluded.support_item_name,
    agreed_rate = excluded.agreed_rate,
    ndis_price_limit = excluded.ndis_price_limit,
    unit_type = excluded.unit_type,
    budget_category = excluded.budget_category,
    budget_allocated = excluded.budget_allocated,
    allow_travel = excluded.allow_travel,
    allow_kilometres = excluded.allow_kilometres,
    allow_non_face_to_face = excluded.allow_non_face_to_face,
    allow_cancellations = excluded.allow_cancellations,
    status = excluded.status;

  return true;
end;
$$;

create or replace function public.sync_native_invoice_bundle(
  invoice_rows jsonb,
  invoice_line_rows jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  tenant_id uuid := public.current_user_organisation_id();
begin
  if tenant_id is null or not public.current_user_can_manage_billing() then
    raise exception 'Billing access is required.' using errcode = '42501';
  end if;

  if exists (
    select 1 from jsonb_array_elements(coalesce(invoice_rows, '[]'::jsonb)) row_data
    where (row_data->>'organisation_id')::uuid is distinct from tenant_id
  ) or exists (
    select 1 from jsonb_array_elements(coalesce(invoice_line_rows, '[]'::jsonb)) row_data
    where (row_data->>'organisation_id')::uuid is distinct from tenant_id
  ) then
    raise exception 'Cross-organisation invoice data is not permitted.' using errcode = '42501';
  end if;

  insert into public.native_invoices (
    id, organisation_id, participant_id, participant_ndis_number,
    invoice_number, recipient_name, recipient_email, billing_period_start,
    billing_period_end, invoice_date, due_date, status, payment_status,
    total_amount, created_by, created_at
  )
  select * from jsonb_to_recordset(coalesce(invoice_rows, '[]'::jsonb)) as row_data(
    id uuid, organisation_id uuid, participant_id uuid,
    participant_ndis_number text, invoice_number text, recipient_name text,
    recipient_email text, billing_period_start date, billing_period_end date,
    invoice_date date, due_date date, status text, payment_status text,
    total_amount numeric, created_by uuid, created_at timestamptz
  )
  on conflict (id) do update set
    participant_id = excluded.participant_id,
    participant_ndis_number = excluded.participant_ndis_number,
    invoice_number = excluded.invoice_number,
    recipient_name = excluded.recipient_name,
    recipient_email = excluded.recipient_email,
    billing_period_start = excluded.billing_period_start,
    billing_period_end = excluded.billing_period_end,
    invoice_date = excluded.invoice_date,
    due_date = excluded.due_date,
    status = excluded.status,
    payment_status = excluded.payment_status,
    total_amount = excluded.total_amount;

  insert into public.native_invoice_lines (
    id, organisation_id, invoice_id, shift_id, service_agreement_id,
    service_agreement_item_id, participant_id, service_date,
    support_item_number, support_item_name, description, quantity, unit_type,
    rate, amount, gst_code, pricing_version_id, pricing_version_name,
    ndis_price_limit_used, agreed_rate_used, evidence_status,
    price_check_status, approval_status, exception_reason, note_reference
  )
  select * from jsonb_to_recordset(coalesce(invoice_line_rows, '[]'::jsonb)) as row_data(
    id uuid, organisation_id uuid, invoice_id uuid, shift_id uuid,
    service_agreement_id uuid, service_agreement_item_id uuid,
    participant_id uuid, service_date date, support_item_number text,
    support_item_name text, description text, quantity numeric, unit_type text,
    rate numeric, amount numeric, gst_code text, pricing_version_id uuid,
    pricing_version_name text, ndis_price_limit_used numeric,
    agreed_rate_used numeric, evidence_status text, price_check_status text,
    approval_status text, exception_reason text, note_reference text
  )
  on conflict (id) do update set
    invoice_id = excluded.invoice_id,
    shift_id = excluded.shift_id,
    service_agreement_id = excluded.service_agreement_id,
    service_agreement_item_id = excluded.service_agreement_item_id,
    participant_id = excluded.participant_id,
    service_date = excluded.service_date,
    support_item_number = excluded.support_item_number,
    support_item_name = excluded.support_item_name,
    description = excluded.description,
    quantity = excluded.quantity,
    unit_type = excluded.unit_type,
    rate = excluded.rate,
    amount = excluded.amount,
    gst_code = excluded.gst_code,
    pricing_version_id = excluded.pricing_version_id,
    pricing_version_name = excluded.pricing_version_name,
    ndis_price_limit_used = excluded.ndis_price_limit_used,
    agreed_rate_used = excluded.agreed_rate_used,
    evidence_status = excluded.evidence_status,
    price_check_status = excluded.price_check_status,
    approval_status = excluded.approval_status,
    exception_reason = excluded.exception_reason,
    note_reference = excluded.note_reference;

  return true;
end;
$$;

revoke all on function public.sync_service_agreement_bundle(jsonb, jsonb) from public, anon;
revoke all on function public.sync_native_invoice_bundle(jsonb, jsonb) from public, anon;
grant execute on function public.sync_service_agreement_bundle(jsonb, jsonb) to authenticated;
grant execute on function public.sync_native_invoice_bundle(jsonb, jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');
