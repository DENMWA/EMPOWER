-- EmpowerNotes subscription entitlements Phase 3.
-- Run after subscription-entitlements-phase1.sql and scheduling-native-invoicing.sql.
-- Adds read-only live usage aggregation and protects paid subscription fields.

create or replace function public.get_organisation_plan_usage(target_organisation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'activeParticipants', (
      select count(*) from public.participants_or_clients
      where organisation_id = target_organisation_id
    ),
    'users', (
      select count(*) from public.users
      where organisation_id = target_organisation_id
    ),
    'houses', (
      select count(*) from public.retained_records
      where organisation_id = target_organisation_id
        and record_type = 'house-profile'
    ),
    'documents', (
      select count(*) from public.documents
      where organisation_id = target_organisation_id
    ),
    'documentsPerParticipant', coalesce((
      select max(document_count)
      from (
        select count(*) as document_count
        from public.documents
        where organisation_id = target_organisation_id
          and participant_id is not null
        group by participant_id
      ) document_counts
    ), 0),
    'aiAnalysedNotesPerMonth', (
      select count(*) from public.entitlement_observations
      where organisation_id = target_organisation_id
        and resource = 'enabled'
        and action_name = 'usage_consumed'
        and observed_at >= date_trunc('month', now())
    ),
    'planDocumentsProcessedPerMonth', (
      select count(*) from public.entitlement_observations
      where organisation_id = target_organisation_id
        and resource = 'basicPlanParsing'
        and action_name = 'usage_consumed'
        and observed_at >= date_trunc('month', now())
    ),
    'storageBytes', coalesce((
      select storage_bytes
      from public.organisation_usage
      where organisation_id = target_organisation_id
      order by usage_period_end desc
      limit 1
    ), 0),
    'invoiceLinesPerMonth', (
      select count(*) from public.native_invoice_lines
      where organisation_id = target_organisation_id
        and created_at >= date_trunc('month', now())
    ),
    'activeServiceAgreements', (
      select count(*) from public.service_agreements
      where organisation_id = target_organisation_id
        and status = 'active'
    )
  )
$$;

revoke all on function public.get_organisation_plan_usage(uuid) from public;
revoke all on function public.get_organisation_plan_usage(uuid) from anon;
revoke all on function public.get_organisation_plan_usage(uuid) from authenticated;
grant execute on function public.get_organisation_plan_usage(uuid) to service_role;

create or replace function public.configure_initial_organisation_trial(
  selected_subscription_tier public.subscription_tier,
  selected_trial_ends_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organisation_id uuid;
begin
  target_organisation_id := public.current_user_organisation_id();
  if target_organisation_id is null then
    raise exception 'No organisation is connected to the current user.';
  end if;

  if exists (
    select 1
    from public.organisations
    where id = target_organisation_id
      and (
        stripe_customer_id is not null
        or stripe_subscription_id is not null
        or trial_ends_at is not null
      )
  ) then
    raise exception 'The initial organisation trial has already been configured.';
  end if;

  perform set_config('app.subscription_update_authorised', 'true', true);

  update public.organisations
  set
    subscription_tier = selected_subscription_tier,
    subscription_status = 'trialing',
    trial_ends_at = selected_trial_ends_at,
    subscription_current_period_end = selected_trial_ends_at,
    subscription_enforcement_mode = 'monitor'
  where id = target_organisation_id;

  return true;
end
$$;

revoke all on function public.configure_initial_organisation_trial(public.subscription_tier, timestamptz) from public;
grant execute on function public.configure_initial_organisation_trial(public.subscription_tier, timestamptz) to authenticated;

create or replace function public.protect_organisation_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.subscription_tier is distinct from new.subscription_tier
    or old.subscription_status is distinct from new.subscription_status
    or old.subscription_current_period_end is distinct from new.subscription_current_period_end
    or old.subscription_grace_ends_at is distinct from new.subscription_grace_ends_at
    or old.subscription_enforcement_mode is distinct from new.subscription_enforcement_mode
    or old.stripe_customer_id is distinct from new.stripe_customer_id
    or old.stripe_subscription_id is distinct from new.stripe_subscription_id
  ) and coalesce(current_setting('app.subscription_update_authorised', true), '') <> 'true'
    and coalesce(auth.role(), '') <> 'service_role'
  then
    raise exception 'Subscription fields may only be updated by trusted billing services.';
  end if;

  return new;
end
$$;

drop trigger if exists protect_organisation_subscription_fields on public.organisations;
create trigger protect_organisation_subscription_fields
before update on public.organisations
for each row execute function public.protect_organisation_subscription_fields();
