-- Flexible handovers for residential, in-home, community and organisation operations.
alter table public.handover_entries alter column house_id drop not null;
alter table public.handover_entries add column if not exists scope_type text;

update public.handover_entries
set scope_type = case when participant_id is not null then 'client' else 'house' end
where scope_type is null;

alter table public.handover_entries alter column scope_type set default 'house';
alter table public.handover_entries alter column scope_type set not null;
alter table public.handover_entries drop constraint if exists handover_entries_scope_type_check;
alter table public.handover_entries add constraint handover_entries_scope_type_check
check (
  (scope_type = 'house' and house_id is not null)
  or (scope_type = 'client' and participant_id is not null)
  or (scope_type = 'organisation' and house_id is null and participant_id is null and category = 'operational')
);

create index if not exists handover_entries_participant_time_idx
  on public.handover_entries (organisation_id, participant_id, created_at desc)
  where participant_id is not null;
create index if not exists handover_entries_scope_time_idx
  on public.handover_entries (organisation_id, scope_type, created_at desc);

drop policy if exists "members view accessible house handovers" on public.handover_entries;
drop policy if exists "members create accessible house handovers" on public.handover_entries;

create policy "members view accessible handovers"
on public.handover_entries for select to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and private.current_user_has_permission('handover.view')
  and (
    (scope_type = 'house' and private.current_user_can_access_house(house_id))
    or (scope_type = 'client' and private.current_user_can_access_participant(participant_id))
    or scope_type = 'organisation'
  )
);

create policy "members create accessible handovers"
on public.handover_entries for insert to authenticated
with check (
  organisation_id = public.current_user_organisation_id()
  and created_by = (select auth.uid())
  and private.current_user_has_permission('handover.create')
  and (
    (scope_type = 'house' and private.current_user_can_access_house(house_id))
    or (scope_type = 'client' and private.current_user_can_access_participant(participant_id))
    or (scope_type = 'organisation' and category = 'operational')
  )
);

notify pgrst, 'reload schema';
