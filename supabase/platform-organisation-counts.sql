-- Aggregated per-organisation usage counts for the platform owner console.
--
-- Run this if the Developer platform console's Overview/Organisations tabs
-- feel slow to load, or if you want to confirm counts are being fetched
-- efficiently. Before this function exists, /api/platform/summary falls
-- back to querying users/clients/incidents once per organisation (3 requests
-- x N organisations). This function replaces that with a single query.
--
-- Safe to run more than once.

create or replace function platform_organisation_counts()
returns table (
  organisation_id uuid,
  users_count bigint,
  clients_count bigint,
  incidents_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id as organisation_id,
    coalesce(u.cnt, 0) as users_count,
    coalesce(c.cnt, 0) as clients_count,
    coalesce(i.cnt, 0) as incidents_count
  from organisations o
  left join (
    select organisation_id, count(*) as cnt
    from users
    group by organisation_id
  ) u on u.organisation_id = o.id
  left join (
    select organisation_id, count(*) as cnt
    from participants_or_clients
    group by organisation_id
  ) c on c.organisation_id = o.id
  left join (
    select organisation_id, count(*) as cnt
    from incident_reports
    group by organisation_id
  ) i on i.organisation_id = o.id;
$$;

-- This function is only ever called with the Supabase service role key
-- (from the /api/platform/summary route, which is already gated by
-- verifyServerAccess(request, "platform")), so security definer + a fixed
-- search_path here is intentional and matches how the rest of the platform
-- endpoints already bypass RLS via the service role.
grant execute on function platform_organisation_counts() to service_role;
