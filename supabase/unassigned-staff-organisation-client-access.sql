-- Staff without an active house assignment can work across all clients in their organisation.
-- Adding one or more active house assignments narrows their house-based access.
create or replace function private.current_user_can_access_participant(requested_participant_id uuid, access_date date default current_date)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.participants_or_clients p
    join public.organisation_memberships om
      on om.user_id = (select auth.uid())
     and om.organisation_id = p.organisation_id
     and om.access_status = 'active'
    where p.id = requested_participant_id
      and p.organisation_id = public.current_user_organisation_id()
      and (
        om.role::text in ('owner','admin','sole_provider')
        or not exists (
          select 1
          from public.staff_house_assignments sha
          where sha.organisation_id = om.organisation_id
            and sha.user_id = om.user_id
            and sha.status in ('active','scheduled')
            and sha.start_date <= access_date
            and (sha.end_date is null or sha.end_date >= access_date)
        )
        or exists (
          select 1 from public.participant_assignments pa
          where pa.organisation_id = p.organisation_id
            and pa.participant_id = p.id
            and pa.user_id = om.user_id
        )
        or exists (
          select 1 from public.participant_house_assignments pha
          where pha.organisation_id = p.organisation_id
            and pha.participant_id = p.id
            and pha.status in ('active','scheduled')
            and pha.start_date <= access_date
            and (pha.end_date is null or pha.end_date >= access_date)
            and private.current_user_can_access_house(pha.house_id, access_date)
        )
      )
  )
$$;

notify pgrst, 'reload schema';
