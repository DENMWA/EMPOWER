-- EmpowerNotes production subscription enforcement.
-- Run after subscription-entitlements-phase3.sql and scheduling-native-invoicing.sql.
-- Safe rollout: all organisations remain in monitor mode until explicitly promoted.

alter table public.documents
  add column if not exists file_size_bytes bigint not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'documents_file_size_bytes_non_negative'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_file_size_bytes_non_negative check (file_size_bytes >= 0);
  end if;
end
$$;

create or replace function public.subscription_resource_limit(
  selected_tier public.subscription_tier,
  resource_name text
)
returns bigint
language sql
immutable
set search_path = public
as $$
  select case resource_name
    when 'activeParticipants' then case selected_tier when 'solo' then 10 when 'practice' then 50 when 'provider' then 300 else null end
    when 'users' then case selected_tier when 'solo' then 1 when 'practice' then 10 when 'provider' then 50 else null end
    when 'houses' then case selected_tier when 'solo' then 1 when 'practice' then 5 when 'provider' then 25 else null end
    when 'documentsPerParticipant' then case selected_tier when 'solo' then 2 when 'practice' then 5 else null end
    when 'aiAnalysedNotesPerMonth' then case selected_tier when 'solo' then 200 when 'practice' then 2000 when 'provider' then 10000 else null end
    when 'storageBytes' then case selected_tier when 'solo' then 2147483648 when 'practice' then 21474836480 when 'provider' then 268435456000 else null end
    when 'approvalStages' then case selected_tier when 'solo' then 1 when 'practice' then 2 when 'provider' then 4 else null end
    when 'invoiceLinesPerMonth' then case selected_tier when 'solo' then 100 when 'practice' then 2000 when 'provider' then 20000 else null end
    when 'activeServiceAgreements' then case selected_tier when 'solo' then 10 when 'practice' then 50 when 'provider' then 300 else null end
    else null
  end
$$;

create or replace function public.record_subscription_decision(
  target_organisation_id uuid,
  resource_name text,
  action_name_value text,
  used_value_number bigint,
  limit_value_number bigint,
  would_block_value boolean,
  decision_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  organisation_tier public.subscription_tier;
  organisation_mode text;
  observation_user_id uuid;
begin
  select subscription_tier, subscription_enforcement_mode
  into organisation_tier, organisation_mode
  from public.organisations
  where id = target_organisation_id;

  if organisation_tier is null then
    return;
  end if;

  select id into observation_user_id
  from public.users
  where id = auth.uid()
  limit 1;

  insert into public.entitlement_observations (
    organisation_id, user_id, subscription_tier, resource, action_name,
    used_value, limit_value, would_block, enforcement_mode, metadata
  ) values (
    target_organisation_id, observation_user_id, organisation_tier, resource_name, action_name_value,
    greatest(used_value_number, 0), limit_value_number, would_block_value,
    coalesce(organisation_mode, 'monitor'), coalesce(decision_metadata, '{}'::jsonb)
  );
end
$$;

revoke all on function public.record_subscription_decision(uuid, text, text, bigint, bigint, boolean, jsonb) from public;

create or replace function public.assert_subscription_write_access(target_organisation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  organisation_record public.organisations%rowtype;
  access_valid boolean;
  reason_text text;
begin
  if coalesce(current_setting('app.subscription_write_bypass', true), '') = 'true' then
    return;
  end if;

  select * into organisation_record
  from public.organisations
  where id = target_organisation_id;

  if organisation_record.id is null then
    raise exception using errcode = 'P0001', message = 'The organisation subscription could not be verified.';
  end if;

  access_valid := case organisation_record.subscription_status::text
    when 'active' then true
    when 'trialing' then organisation_record.trial_ends_at is null or organisation_record.trial_ends_at > now()
    when 'past_due' then organisation_record.subscription_grace_ends_at is not null and organisation_record.subscription_grace_ends_at > now()
    else false
  end;

  if access_valid then
    return;
  end if;

  reason_text := case organisation_record.subscription_status::text
    when 'trialing' then 'The organisation trial has expired.'
    when 'past_due' then 'The subscription payment grace period has ended.'
    when 'cancelled' then 'The organisation subscription is cancelled.'
    when 'suspended' then 'The organisation subscription is suspended.'
    when 'paused' then 'The organisation subscription is paused.'
    else 'The organisation subscription is not active.'
  end;

  perform public.record_subscription_decision(
    target_organisation_id, 'subscriptionWriteAccess', 'write_attempt', 1, 0, true,
    jsonb_build_object('status', organisation_record.subscription_status::text, 'reason', reason_text)
  );

  if organisation_record.subscription_enforcement_mode = 'enforce' then
    raise exception using errcode = 'P0001', message = reason_text || ' Existing records remain available for viewing and export.';
  end if;
end
$$;

create or replace function public.enforce_tenant_write_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organisation_id uuid;
begin
  target_organisation_id := case when tg_op = 'DELETE' then old.organisation_id else new.organisation_id end;
  if target_organisation_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  perform public.assert_subscription_write_access(target_organisation_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

create or replace function public.assert_plan_capacity(
  target_organisation_id uuid,
  resource_name text,
  used_value_number bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  organisation_tier public.subscription_tier;
  organisation_mode text;
  limit_value_number bigint;
  would_block_value boolean;
begin
  select subscription_tier, subscription_enforcement_mode
  into organisation_tier, organisation_mode
  from public.organisations
  where id = target_organisation_id;

  if organisation_tier is null then
    raise exception using errcode = 'P0001', message = 'The organisation plan could not be verified.';
  end if;

  limit_value_number := public.subscription_resource_limit(organisation_tier, resource_name);
  would_block_value := limit_value_number is not null and used_value_number >= limit_value_number;
  if not would_block_value then
    return;
  end if;

  perform public.record_subscription_decision(
    target_organisation_id, resource_name, 'create_attempt', used_value_number,
    limit_value_number, true, jsonb_build_object('tier', organisation_tier::text)
  );

  if organisation_mode = 'enforce' then
    raise exception using
      errcode = 'P0001',
      message = initcap(regexp_replace(resource_name, '([A-Z])', ' \1', 'g')) ||
        ' has reached the ' || initcap(organisation_tier::text) || ' plan limit of ' || limit_value_number || '.';
  end if;
end
$$;

create or replace function public.enforce_participant_plan_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare used_count bigint;
begin
  if exists (select 1 from public.participants_or_clients where id = new.id) then return new; end if;
  select count(*) into used_count from public.participants_or_clients where organisation_id = new.organisation_id;
  perform public.assert_plan_capacity(new.organisation_id, 'activeParticipants', used_count);
  return new;
end $$;

create or replace function public.enforce_user_plan_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare used_count bigint;
begin
  if exists (select 1 from public.users where id = new.id) then return new; end if;
  select count(*) into used_count from public.users where organisation_id = new.organisation_id;
  perform public.assert_plan_capacity(new.organisation_id, 'users', used_count);
  return new;
end $$;

create or replace function public.enforce_house_plan_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare used_count bigint;
begin
  if new.record_type <> 'house-profile' then return new; end if;
  if exists (select 1 from public.retained_records where organisation_id = new.organisation_id and id = new.id) then return new; end if;
  select count(*) into used_count from public.retained_records where organisation_id = new.organisation_id and record_type = 'house-profile';
  perform public.assert_plan_capacity(new.organisation_id, 'houses', used_count);
  return new;
end $$;

create or replace function public.enforce_document_plan_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare used_count bigint; used_storage bigint; existing_size bigint; storage_limit bigint; organisation_tier public.subscription_tier; organisation_mode text;
begin
  select file_size_bytes into existing_size from public.documents where id = new.id;
  if existing_size is null then
    select count(*) into used_count from public.documents where organisation_id = new.organisation_id and participant_id = new.participant_id;
    perform public.assert_plan_capacity(new.organisation_id, 'documentsPerParticipant', used_count);
  end if;

  select subscription_tier, subscription_enforcement_mode into organisation_tier, organisation_mode
  from public.organisations where id = new.organisation_id;
  storage_limit := public.subscription_resource_limit(organisation_tier, 'storageBytes');
  select coalesce(sum(file_size_bytes), 0) into used_storage from public.documents where organisation_id = new.organisation_id;
  used_storage := used_storage - coalesce(existing_size, 0) + new.file_size_bytes;
  if storage_limit is not null and used_storage > storage_limit then
    perform public.record_subscription_decision(new.organisation_id, 'storageBytes', 'upload_attempt', used_storage, storage_limit, true, '{}'::jsonb);
    if organisation_mode = 'enforce' then
      raise exception using errcode = 'P0001', message = 'Organisation storage has reached the current plan limit.';
    end if;
  end if;
  return new;
end $$;

create or replace function public.enforce_service_agreement_plan_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare used_count bigint;
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then return new; end if;
  select count(*) into used_count from public.service_agreements where organisation_id = new.organisation_id and status = 'active' and id <> new.id;
  perform public.assert_plan_capacity(new.organisation_id, 'activeServiceAgreements', used_count);
  return new;
end $$;

create or replace function public.enforce_invoice_line_plan_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare used_count bigint;
begin
  if exists (select 1 from public.native_invoice_lines where id = new.id) then return new; end if;
  select count(*) into used_count from public.native_invoice_lines
  where organisation_id = new.organisation_id and created_at >= date_trunc('month', now());
  perform public.assert_plan_capacity(new.organisation_id, 'invoiceLinesPerMonth', used_count);
  return new;
end $$;

drop trigger if exists enforce_participant_plan_limit on public.participants_or_clients;
create trigger enforce_participant_plan_limit before insert on public.participants_or_clients
for each row execute function public.enforce_participant_plan_limit();

drop trigger if exists enforce_user_plan_limit on public.users;
create trigger enforce_user_plan_limit before insert on public.users
for each row execute function public.enforce_user_plan_limit();

drop trigger if exists enforce_house_plan_limit on public.retained_records;
create trigger enforce_house_plan_limit before insert on public.retained_records
for each row execute function public.enforce_house_plan_limit();

drop trigger if exists enforce_document_plan_limit on public.documents;
create trigger enforce_document_plan_limit before insert or update of file_size_bytes, participant_id on public.documents
for each row execute function public.enforce_document_plan_limit();

create or replace function public.sync_document_storage_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organisation_id uuid;
  current_storage bigint;
  period_start date := date_trunc('month', current_date)::date;
  period_end date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
begin
  target_organisation_id := case when tg_op = 'DELETE' then old.organisation_id else new.organisation_id end;
  select coalesce(sum(file_size_bytes), 0) into current_storage
  from public.documents where organisation_id = target_organisation_id;

  insert into public.organisation_usage (
    organisation_id, usage_period_start, usage_period_end, storage_bytes, updated_at
  ) values (
    target_organisation_id, period_start, period_end, current_storage, now()
  )
  on conflict (organisation_id, usage_period_start, usage_period_end)
  do update set storage_bytes = excluded.storage_bytes, updated_at = now();

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

drop trigger if exists sync_document_storage_usage on public.documents;
create trigger sync_document_storage_usage
after insert or update of file_size_bytes or delete on public.documents
for each row execute function public.sync_document_storage_usage();

drop trigger if exists enforce_service_agreement_plan_limit on public.service_agreements;
create trigger enforce_service_agreement_plan_limit before insert or update of status on public.service_agreements
for each row execute function public.enforce_service_agreement_plan_limit();

drop trigger if exists enforce_invoice_line_plan_limit on public.native_invoice_lines;
create trigger enforce_invoice_line_plan_limit before insert on public.native_invoice_lines
for each row execute function public.enforce_invoice_line_plan_limit();

revoke all on function public.subscription_resource_limit(public.subscription_tier, text) from public, anon, authenticated;
revoke all on function public.assert_subscription_write_access(uuid) from public, anon, authenticated;
revoke all on function public.assert_plan_capacity(uuid, text, bigint) from public, anon, authenticated;
revoke all on function public.enforce_tenant_write_subscription() from public, anon, authenticated;
revoke all on function public.enforce_participant_plan_limit() from public, anon, authenticated;
revoke all on function public.enforce_user_plan_limit() from public, anon, authenticated;
revoke all on function public.enforce_house_plan_limit() from public, anon, authenticated;
revoke all on function public.enforce_document_plan_limit() from public, anon, authenticated;
revoke all on function public.enforce_service_agreement_plan_limit() from public, anon, authenticated;
revoke all on function public.enforce_invoice_line_plan_limit() from public, anon, authenticated;
revoke all on function public.sync_document_storage_usage() from public, anon, authenticated;
grant execute on function public.subscription_resource_limit(public.subscription_tier, text) to service_role;

-- Protect writes on every organisation-owned table while leaving SELECT/export policies unchanged.
do $$
declare table_record record;
begin
  for table_record in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'organisation_id'
      and t.table_type = 'BASE TABLE'
      and c.table_name not in ('entitlement_observations', 'organisation_usage')
  loop
    execute format('drop trigger if exists enforce_subscription_write_access on public.%I', table_record.table_name);
    execute format(
      'create trigger enforce_subscription_write_access before insert or update or delete on public.%I for each row execute function public.enforce_tenant_write_subscription()',
      table_record.table_name
    );
  end loop;
end
$$;

create or replace view public.subscription_enforcement_readiness as
select
  o.id as organisation_id,
  o.name as organisation_name,
  o.subscription_tier,
  o.subscription_status,
  o.subscription_enforcement_mode,
  o.trial_ends_at,
  count(e.id) filter (where e.would_block and e.observed_at >= now() - interval '30 days') as would_block_last_30_days,
  max(e.observed_at) filter (where e.would_block) as last_would_block_at
from public.organisations o
left join public.entitlement_observations e on e.organisation_id = o.id
group by o.id, o.name, o.subscription_tier, o.subscription_status,
  o.subscription_enforcement_mode, o.trial_ends_at;

revoke all on public.subscription_enforcement_readiness from public, anon, authenticated;
grant select on public.subscription_enforcement_readiness to service_role;

-- Promote one validated organisation only after its would-block count is understood:
-- begin;
-- select set_config('app.subscription_update_authorised', 'true', true);
-- update public.organisations
-- set subscription_enforcement_mode = 'enforce'
-- where id = '<organisation uuid>' and subscription_status in ('trialing', 'active');
-- commit;
