-- EmpowerNotes compliance hardening identified during the 2026-08 review.
-- Review, back up, and run this migration in the linked Supabase project.

begin;

drop policy if exists "incident reports visible in own organisation" on public.incident_reports;
drop policy if exists "users save incident reports in own organisation" on public.incident_reports;
drop policy if exists "users update incident reports in own organisation" on public.incident_reports;

revoke execute on function public.configure_initial_organisation_trial(public.subscription_tier, timestamptz) from anon;
revoke execute on function public.current_organisation_enforcement_mode() from anon;
revoke execute on function public.current_user_can_manage_pricing() from anon;
revoke execute on function public.current_user_profile() from anon;
revoke execute on function public.record_subscription_decision(uuid, text, text, bigint, bigint, boolean, jsonb) from anon;
revoke execute on function public.enforce_worker_document_scope() from anon, authenticated;
revoke execute on function public.protect_organisation_subscription_fields() from anon, authenticated;

alter function public.current_organisation_access_allowed() set search_path = public, pg_temp;
alter function public.current_organisation_subscription_status() set search_path = public, pg_temp;
alter function public.current_organisation_subscription_tier() set search_path = public, pg_temp;
alter function public.current_organisation_usage() set search_path = public, pg_temp;
alter function public.role_default_permissions(public.user_role) set search_path = public, pg_temp;

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'participant-documents';

select pg_notify('pgrst', 'reload schema');

commit;
