-- Permit workers to correct their own notes until manager approval.
-- Approved and locked records remain immutable to worker sessions.

drop policy if exists "workers update own notes and managers update organisation notes" on public.progress_notes;
drop policy if exists "workers update own unapproved notes" on public.progress_notes;

create policy "workers update own unapproved notes"
on public.progress_notes
for update
to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and staff_id = (select auth.uid())
  and status not in ('Approved', 'Locked')
  and private.current_user_has_permission('notes.create')
  and private.current_user_can_access_participant(participant_id)
)
with check (
  organisation_id = public.current_user_organisation_id()
  and staff_id = (select auth.uid())
  and status not in ('Approved', 'Locked')
  and private.current_user_has_permission('notes.create')
  and private.current_user_can_access_participant(participant_id)
);

select pg_notify('pgrst', 'reload schema');
