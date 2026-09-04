-- EmpowerNotes roster assignment identity repair.
-- Run this if rostered shifts save as unassigned, disappear after staff assignment,
-- or assigned workers cannot see shifts in My Roster.
-- Safe to run more than once.

alter table public.shift_staff
  alter column staff_user_id drop not null;

alter table public.shift_staff
  add column if not exists staff_invite_id uuid references public.staff_invites(id) on delete cascade;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shift_staff_has_assignee'
      and conrelid = 'public.shift_staff'::regclass
  ) then
    alter table public.shift_staff
      add constraint shift_staff_has_assignee
      check (staff_user_id is not null or staff_invite_id is not null);
  end if;
end
$$;

create unique index if not exists idx_shift_staff_unique_assignment
  on public.shift_staff(shift_id, staff_user_id)
  where staff_user_id is not null;

create unique index if not exists idx_shift_staff_unique_invite_assignment
  on public.shift_staff(shift_id, staff_invite_id)
  where staff_invite_id is not null;

update public.shift_staff assignment
set staff_user_id = invitation.auth_user_id
from public.organisation_invites invitation
where assignment.staff_user_id is null
  and assignment.staff_invite_id = invitation.staff_invite_id
  and assignment.organisation_id = invitation.organisation_id
  and invitation.status = 'accepted'
  and invitation.auth_user_id is not null;

update public.shift_staff assignment
set staff_user_id = app_user.id
from public.staff_invites staff
join public.users app_user
  on app_user.organisation_id = staff.organisation_id
  and lower(app_user.email) = lower(staff.email)
where assignment.staff_user_id is null
  and assignment.staff_invite_id = staff.id
  and assignment.organisation_id = staff.organisation_id;

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

    if new.staff_user_id is null then
      select app_user.id into new.staff_user_id
      from public.staff_invites staff
      join public.users app_user
        on app_user.organisation_id = staff.organisation_id
        and lower(app_user.email) = lower(staff.email)
      where staff.id = new.staff_invite_id
        and staff.organisation_id = new.organisation_id
      limit 1;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.link_shift_assignment_to_auth_user() from public, anon, authenticated;

drop trigger if exists shift_staff_link_auth_identity on public.shift_staff;
create trigger shift_staff_link_auth_identity
before insert or update of staff_invite_id on public.shift_staff
for each row execute function private.link_shift_assignment_to_auth_user();

grant select, insert, update, delete on public.shift_staff to authenticated;
select pg_notify('pgrst', 'reload schema');
