-- Read-only production verification after repair-client-rls.sql and
-- atomic-billing-sync.sql have been run.

select
  'client_rls_enabled' as check_name,
  case when c.relrowsecurity then 'OK' else 'MISSING' end as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'participants_or_clients'

union all

select
  'client_insert_policy',
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'participants_or_clients'
      and policyname = 'managers create organisation participants'
  ) then 'OK' else 'MISSING' end

union all

select
  'client_update_policy',
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'participants_or_clients'
      and policyname = 'managers update organisation participants'
  ) then 'OK' else 'MISSING' end

union all

select
  'service_agreement_transaction',
  case when to_regprocedure('public.sync_service_agreement_bundle(jsonb,jsonb)') is not null
    then 'OK' else 'MISSING' end

union all

select
  'invoice_transaction',
  case when to_regprocedure('public.sync_native_invoice_bundle(jsonb,jsonb)') is not null
    then 'OK' else 'MISSING' end

order by check_name;
