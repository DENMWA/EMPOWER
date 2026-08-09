-- Allow repeat saves of a progress note without widening tenant access.
-- Safe to run repeatedly.

drop policy if exists "workers update own notes and managers update organisation notes"
on public.progress_notes;

create policy "workers update own notes and managers update organisation notes"
on public.progress_notes
for update
to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and (
    public.current_user_is_manager()
    or staff_id = (select auth.uid())
  )
)
with check (
  organisation_id = public.current_user_organisation_id()
  and (
    public.current_user_is_manager()
    or (
      staff_id = (select auth.uid())
      and public.assigned_to_participant(participant_id)
    )
  )
);

notify pgrst, 'reload schema';
