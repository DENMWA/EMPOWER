-- Atomic manager review actions for submitted progress notes.
-- Safe to run repeatedly after the core EmpowerNotes schema.

create or replace function public.review_progress_note(
  selected_note_id uuid,
  selected_action text,
  reviewer_comments text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reviewer public.users%rowtype;
  target public.progress_notes%rowtype;
  next_status public.note_status;
  approval_action text;
begin
  select * into reviewer
  from public.users
  where id = (select auth.uid())
  limit 1;

  if reviewer.id is null
    or reviewer.access_status = 'suspended'
    or not (
      reviewer.role in ('owner', 'admin', 'sole_provider')
      or (
        reviewer.role in ('team_leader', 'case_manager', 'service_manager')
        and 'shift_verification' = any(coalesce(reviewer.admin_permissions, '{}'::text[]))
      )
    )
  then
    raise exception 'Shift verification access is required.' using errcode = '42501';
  end if;

  select * into target
  from public.progress_notes
  where id = selected_note_id
    and organisation_id = reviewer.organisation_id
  for update;

  if target.id is null then
    raise exception 'Progress note not found.' using errcode = 'P0002';
  end if;

  if target.status = 'Locked' then
    raise exception 'This progress note is already certified and locked.' using errcode = '55000';
  end if;

  if selected_action = 'approve' then
    next_status := 'Approved';
    approval_action := 'approved';
  elsif selected_action = 'request_details' then
    if nullif(trim(reviewer_comments), '') is null then
      raise exception 'Add the details the staff member needs to provide.' using errcode = '22023';
    end if;
    next_status := 'Needs Review';
    approval_action := 'sent_back';
  elsif selected_action = 'certify' then
    if reviewer.role not in ('owner', 'admin', 'sole_provider') then
      raise exception 'Only an owner or full administrator can certify and lock a note.' using errcode = '42501';
    end if;
    next_status := 'Locked';
    approval_action := 'locked';
  else
    raise exception 'Unknown review action.' using errcode = '22023';
  end if;

  update public.progress_notes
  set status = next_status,
      owner_approved = selected_action = 'certify',
      locked_at = case when selected_action = 'certify' then now() else locked_at end,
      updated_at = now()
  where id = target.id;

  insert into public.approvals (
    organisation_id,
    progress_note_id,
    reviewer_id,
    action,
    comments
  ) values (
    reviewer.organisation_id,
    target.id,
    reviewer.id,
    approval_action,
    nullif(trim(reviewer_comments), '')
  );

  insert into public.audit_logs (
    organisation_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    reviewer.organisation_id,
    reviewer.id,
    'progress_note_' || approval_action,
    'progress_note',
    target.id,
    jsonb_build_object('status', next_status, 'comments', coalesce(reviewer_comments, ''))
  );

  return next_status::text;
end
$$;

revoke all on function public.review_progress_note(uuid, text, text) from public;
revoke all on function public.review_progress_note(uuid, text, text) from anon;
grant execute on function public.review_progress_note(uuid, text, text) to authenticated;

select pg_notify('pgrst', 'reload schema');
