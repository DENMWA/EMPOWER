-- EmpowerNotes admin Document Vault and duty-based review access.
-- Run once in the Supabase SQL editor after membership-authority-hardening.sql.

alter table public.users drop constraint if exists users_admin_permissions_valid;
alter table public.users add constraint users_admin_permissions_valid
  check (admin_permissions <@ array[
    'incident_actioning', 'shift_verification', 'scheduling', 'people',
    'team', 'billing', 'reports', 'documents', 'settings'
  ]::text[]);

alter table public.staff_invites drop constraint if exists staff_invites_admin_permissions_valid;
alter table public.staff_invites add constraint staff_invites_admin_permissions_valid
  check (admin_permissions <@ array[
    'incident_actioning', 'shift_verification', 'scheduling', 'people',
    'team', 'billing', 'reports', 'documents', 'settings'
  ]::text[]);

drop policy if exists "document managers review organisation documents" on public.documents;
create policy "document managers review organisation documents"
on public.documents
for update
to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and private.current_user_has_permission('documents.manage')
)
with check (
  organisation_id = public.current_user_organisation_id()
  and private.current_user_has_permission('documents.manage')
);

select pg_notify('pgrst', 'reload schema');
