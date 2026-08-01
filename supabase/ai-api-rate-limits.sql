-- EmpowerNotes AI API rate limits.
-- Run after schema.sql and fix-users-rls-recursion.sql.
-- Safe to run more than once.

create table if not exists public.ai_api_rate_limits (
  action_name text not null,
  scope_type text not null check (scope_type in ('user', 'organisation')),
  scope_id uuid not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (action_name, scope_type, scope_id, window_started_at)
);

create index if not exists ai_api_rate_limits_cleanup_idx
  on public.ai_api_rate_limits (window_started_at);

alter table public.ai_api_rate_limits enable row level security;
revoke all on table public.ai_api_rate_limits from public, anon, authenticated;

drop function if exists public.consume_ai_rate_limit(text, integer, integer, integer);

create or replace function public.consume_ai_rate_limit(
  requested_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_organisation_id uuid;
  current_window timestamptz;
  user_count integer;
  organisation_count integer;
  retry_after_seconds integer;
  user_request_limit integer;
  organisation_request_limit integer;
  window_seconds integer := 900;
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  case requested_action
    when 'improve_note' then
      user_request_limit := 30;
      organisation_request_limit := 300;
    when 'parse_plan' then
      user_request_limit := 5;
      organisation_request_limit := 50;
    else
      raise exception 'Unknown AI action.' using errcode = '22023';
  end case;

  select organisation_id
    into actor_organisation_id
  from public.users
  where id = actor_id;

  if actor_organisation_id is null then
    raise exception 'A verified organisation profile is required.' using errcode = '42501';
  end if;

  current_window := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds
  );

  insert into public.ai_api_rate_limits (
    action_name, scope_type, scope_id, window_started_at, request_count, updated_at
  ) values (
    requested_action, 'user', actor_id, current_window, 1, now()
  )
  on conflict (action_name, scope_type, scope_id, window_started_at)
  do update set
    request_count = public.ai_api_rate_limits.request_count + 1,
    updated_at = now()
  returning request_count into user_count;

  insert into public.ai_api_rate_limits (
    action_name, scope_type, scope_id, window_started_at, request_count, updated_at
  ) values (
    requested_action, 'organisation', actor_organisation_id, current_window, 1, now()
  )
  on conflict (action_name, scope_type, scope_id, window_started_at)
  do update set
    request_count = public.ai_api_rate_limits.request_count + 1,
    updated_at = now()
  returning request_count into organisation_count;

  retry_after_seconds := greatest(
    1,
    ceil(extract(epoch from current_window + make_interval(secs => window_seconds) - clock_timestamp()))::integer
  );

  return jsonb_build_object(
    'allowed', user_count <= user_request_limit and organisation_count <= organisation_request_limit,
    'userCount', user_count,
    'userLimit', user_request_limit,
    'organisationCount', organisation_count,
    'organisationLimit', organisation_request_limit,
    'retryAfterSeconds', retry_after_seconds
  );
end;
$$;

revoke all on function public.consume_ai_rate_limit(text) from public, anon;
grant execute on function public.consume_ai_rate_limit(text) to authenticated;

comment on function public.consume_ai_rate_limit(text) is
  'Atomically consumes user and organisation AI request allowance using auth.uid-derived tenancy.';
