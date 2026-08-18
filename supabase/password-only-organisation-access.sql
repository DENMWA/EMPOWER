-- Password-only organisation access.
-- Run this if privileged-mfa-rls.sql was applied and organisation admins should
-- use email/password only while role, permission and tenant RLS checks remain active.

create or replace function private.current_user_requires_privileged_mfa()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select false;
$$;

create or replace function private.current_session_satisfies_privileged_mfa()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select true;
$$;

revoke all on function private.current_user_requires_privileged_mfa() from public, anon;
revoke all on function private.current_session_satisfies_privileged_mfa() from public, anon;
grant execute on function private.current_user_requires_privileged_mfa() to authenticated;
grant execute on function private.current_session_satisfies_privileged_mfa() to authenticated;

comment on function private.current_session_satisfies_privileged_mfa() is
  'Organisation access is controlled by password sign-in, role permissions and tenant RLS. TOTP step-up is disabled for client-facing organisation workflows.';

notify pgrst, 'reload schema';
