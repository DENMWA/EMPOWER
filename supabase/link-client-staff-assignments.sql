-- Link assignments made from either the client profile or staff invitation.
-- Safe to run repeatedly after the core EmpowerNotes schema.

create or replace function public.assigned_to_participant(participant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (
      select 1
      from public.participant_assignments assignment
      where assignment.participant_id = participant
        and assignment.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.participants_or_clients client
      where client.id = participant
        and client.organisation_id = public.current_user_organisation_id()
        and (
          (select auth.uid())::text = any(coalesce(client.assigned_worker_ids, '{}'::text[]))
          or exists (
            select 1
            from public.staff_invites invite
            join public.users app_user
              on app_user.id = (select auth.uid())
             and lower(app_user.email) = lower(invite.email)
             and app_user.organisation_id = invite.organisation_id
            where invite.organisation_id = client.organisation_id
              and invite.invite_status <> 'Suspended'
              and (
                invite.id::text = any(coalesce(client.assigned_worker_ids, '{}'::text[]))
                or participant::text = any(coalesce(invite.assigned_participant_ids, '{}'::text[]))
              )
          )
        )
    )
$$;

revoke all on function public.assigned_to_participant(uuid) from public;
revoke all on function public.assigned_to_participant(uuid) from anon;
grant execute on function public.assigned_to_participant(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
