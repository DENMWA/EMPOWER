-- Enforce MFA for privileged tenant sessions at the database boundary.
-- Ordinary workers remain at AAL1. Service-role operations bypass RLS as designed.

begin;

create or replace function private.current_user_requires_privileged_mfa()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.organisation_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.organisation_id = public.current_user_organisation_id()
      and membership.access_status = 'active'
      and (
        membership.role::text in ('owner', 'admin', 'sole_provider')
        or cardinality(coalesce(membership.admin_permissions, '{}'::text[])) > 0
      )
  )
$$;

create or replace function private.current_session_satisfies_privileged_mfa()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select not private.current_user_requires_privileged_mfa()
    or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
$$;

revoke all on function private.current_user_requires_privileged_mfa() from public, anon;
revoke all on function private.current_session_satisfies_privileged_mfa() from public, anon;
grant execute on function private.current_user_requires_privileged_mfa() to authenticated;
grant execute on function private.current_session_satisfies_privileged_mfa() to authenticated;

do $$
declare
  target_table text;
  protected_tables constant text[] := array[
    'users', 'organisations', 'organisation_profiles', 'organisation_memberships', 'organisation_invites',
    'staff_invites', 'participants_or_clients', 'participant_assignments', 'service_locations',
    'staff_house_assignments', 'participant_house_assignments', 'documents', 'document_expiry_notifications',
    'progress_notes', 'incident_reports', 'incident_review_history', 'retained_records',
    'participant_goals', 'goal_evidence', 'handover_entries', 'handover_acknowledgements',
    'support_shifts', 'shift_staff', 'shift_notes', 'shift_cancellations', 'roster_shifts',
    'staff_availability', 'roster_replacement_offers', 'service_agreements', 'service_agreement_items',
    'native_invoices', 'native_invoice_lines', 'restrictive_practice_authorisations', 'restrictive_practice_uses'
  ];
begin
  foreach target_table in array protected_tables loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('drop policy if exists "privileged sessions require aal2" on public.%I', target_table);
      execute format(
        'create policy "privileged sessions require aal2" on public.%I as restrictive for all to authenticated using (private.current_session_satisfies_privileged_mfa()) with check (private.current_session_satisfies_privileged_mfa())',
        target_table
      );
    end if;
  end loop;
end
$$;

drop policy if exists "privileged sessions require aal2" on storage.objects;
create policy "privileged sessions require aal2"
on storage.objects
as restrictive
for all
to authenticated
using (private.current_session_satisfies_privileged_mfa())
with check (private.current_session_satisfies_privileged_mfa());

select pg_notify('pgrst', 'reload schema');

commit;
