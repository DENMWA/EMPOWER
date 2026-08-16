-- Worker personal roster isolation.
-- Managers retain organisation-wide scheduling access. Workers can only read assignments made to
-- their authenticated user id. Accepted invitations are linked to that stable identity.

alter table public.support_shifts enable row level security;
alter table public.shift_staff enable row level security;

update public.shift_staff assignment
set staff_user_id = invitation.auth_user_id
from public.organisation_invites invitation
where assignment.staff_user_id is null
  and assignment.staff_invite_id = invitation.staff_invite_id
  and assignment.organisation_id = invitation.organisation_id
  and invitation.status = 'accepted'
  and invitation.auth_user_id is not null;

create or replace function private.link_shift_assignment_to_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.staff_user_id is null and new.staff_invite_id is not null then
    select invitation.auth_user_id into new.staff_user_id
    from public.organisation_invites invitation
    where invitation.organisation_id = new.organisation_id
      and invitation.staff_invite_id = new.staff_invite_id
      and invitation.status = 'accepted'
      and invitation.auth_user_id is not null
    order by invitation.accepted_at desc nulls last
    limit 1;
  end if;
  return new;
end;
$$;

revoke all on function private.link_shift_assignment_to_auth_user() from public, anon, authenticated;
drop trigger if exists shift_staff_link_auth_identity on public.shift_staff;
create trigger shift_staff_link_auth_identity
before insert or update of staff_invite_id on public.shift_staff
for each row execute function private.link_shift_assignment_to_auth_user();

drop policy if exists "staff view shift assignments" on public.shift_staff;
create policy "staff view own shift assignments"
on public.shift_staff for select to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and (
    public.current_user_is_manager()
    or staff_user_id = (select auth.uid())
  )
);

drop policy if exists "organisation shift access" on public.support_shifts;
create policy "managers view organisation shifts workers view assigned shifts"
on public.support_shifts for select to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and (
    public.current_user_is_manager()
    or exists (
      select 1
      from public.shift_staff assignment
      where assignment.shift_id = support_shifts.id
        and assignment.organisation_id = support_shifts.organisation_id
        and assignment.staff_user_id = (select auth.uid())
    )
  )
);

grant select on public.support_shifts, public.shift_staff to authenticated;
select pg_notify('pgrst', 'reload schema');
