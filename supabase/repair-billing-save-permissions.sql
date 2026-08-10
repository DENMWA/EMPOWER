-- Align billing saves with EmpowerNotes delegated admin permissions.
-- Run this first, then rerun atomic-billing-sync.sql.

create or replace function public.current_user_can_manage_billing()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.organisation_id is not null
      and coalesce(u.access_status, 'active') = 'active'
      and (
        u.role in ('owner', 'admin', 'sole_provider')
        or (
          u.role in ('team_leader', 'case_manager', 'service_manager')
          and 'billing' = any(coalesce(u.admin_permissions, '{}'::text[]))
        )
      )
  )
$$;

revoke all on function public.current_user_can_manage_billing() from public, anon;
grant execute on function public.current_user_can_manage_billing() to authenticated;

select pg_notify('pgrst', 'reload schema');
