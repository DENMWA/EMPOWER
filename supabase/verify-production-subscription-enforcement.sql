-- Read-only verification after production-subscription-enforcement.sql.

select
  to_regprocedure('public.subscription_resource_limit(public.subscription_tier,text)') as limit_function,
  to_regprocedure('public.assert_subscription_write_access(uuid)') as write_guard_function,
  to_regprocedure('public.assert_plan_capacity(uuid,text,bigint)') as capacity_function,
  to_regclass('public.subscription_enforcement_readiness') as readiness_view;

select
  event_object_table as table_name,
  trigger_name,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'enforce_subscription_write_access',
    'enforce_participant_plan_limit',
    'enforce_user_plan_limit',
    'enforce_house_plan_limit',
    'enforce_document_plan_limit',
    'enforce_service_agreement_plan_limit',
    'enforce_invoice_line_plan_limit',
    'sync_document_storage_usage'
  )
order by table_name, trigger_name, event_manipulation;

select
  subscription_tier,
  public.subscription_resource_limit(subscription_tier, 'activeParticipants') as participant_limit,
  public.subscription_resource_limit(subscription_tier, 'users') as user_limit,
  public.subscription_resource_limit(subscription_tier, 'houses') as house_limit,
  public.subscription_resource_limit(subscription_tier, 'documentsPerParticipant') as document_limit,
  public.subscription_resource_limit(subscription_tier, 'aiAnalysedNotesPerMonth') as ai_note_limit,
  public.subscription_resource_limit(subscription_tier, 'invoiceLinesPerMonth') as invoice_line_limit
from unnest(enum_range(null::public.subscription_tier)) as tiers(subscription_tier);

select *
from public.subscription_enforcement_readiness
order by organisation_name;
