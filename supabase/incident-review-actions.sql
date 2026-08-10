-- Atomic incident review decisions with manager history and audit logging.
-- Safe to run repeatedly after the incident reports schema.

create table if not exists public.incident_reviews (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  incident_report_id uuid not null references public.incident_reports(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete restrict,
  action text not null check (action in ('approved', 'sent_back', 'closed')),
  comments text not null,
  review_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_incident_reviews_incident_created
  on public.incident_reviews (incident_report_id, created_at desc);

alter table public.incident_reviews enable row level security;

drop policy if exists "incident reviewers view organisation history" on public.incident_reviews;
create policy "incident reviewers view organisation history"
  on public.incident_reviews for select to authenticated
  using (organisation_id = public.current_user_organisation_id());

create or replace function public.review_incident_report(
  selected_app_incident_id text,
  selected_action text,
  reviewer_comments text,
  review_payload jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reviewer public.users%rowtype;
  target public.incident_reports%rowtype;
  next_status text;
  review_action text;
begin
  select * into reviewer from public.users where id = (select auth.uid()) limit 1;

  if reviewer.id is null
    or reviewer.access_status = 'suspended'
    or not (
      reviewer.role in ('owner', 'admin', 'sole_provider')
      or (
        reviewer.role in ('team_leader', 'case_manager', 'service_manager')
        and 'incident_actioning' = any(coalesce(reviewer.admin_permissions, '{}'::text[]))
      )
    )
  then
    raise exception 'Incident actioning access is required.' using errcode = '42501';
  end if;

  if nullif(trim(reviewer_comments), '') is null then
    raise exception 'Add a manager response before recording the decision.' using errcode = '22023';
  end if;

  select * into target
  from public.incident_reports
  where organisation_id = reviewer.organisation_id
    and app_incident_id = selected_app_incident_id
  for update;

  if target.id is null then
    raise exception 'Incident report not found.' using errcode = 'P0002';
  end if;
  if target.status = 'Locked' then
    raise exception 'This incident report is already certified and closed.' using errcode = '55000';
  end if;

  if selected_action = 'approve' then
    next_status := 'Approved';
    review_action := 'approved';
  elsif selected_action = 'request_details' then
    next_status := 'Needs Review';
    review_action := 'sent_back';
  elsif selected_action = 'certify' then
    if reviewer.role not in ('owner', 'admin', 'sole_provider') then
      raise exception 'Only an owner or full administrator can certify and close an incident.' using errcode = '42501';
    end if;
    next_status := 'Locked';
    review_action := 'closed';
  else
    raise exception 'Unknown incident review action.' using errcode = '22023';
  end if;

  update public.incident_reports
  set status = next_status,
      manager_comments = trim(reviewer_comments),
      manager_review_status = case when next_status = 'Locked' then 'Closed' when next_status = 'Approved' then 'Actioned' else 'Further Details Requested' end,
      incident_payload = coalesce(incident_payload, '{}'::jsonb)
        || coalesce(review_payload, '{}'::jsonb)
        || jsonb_build_object('status', next_status, 'managerReview', trim(reviewer_comments)),
      updated_at = now()
  where id = target.id;

  insert into public.incident_reviews (organisation_id, incident_report_id, reviewer_id, action, comments, review_payload)
  values (reviewer.organisation_id, target.id, reviewer.id, review_action, trim(reviewer_comments), coalesce(review_payload, '{}'::jsonb));

  insert into public.audit_logs (organisation_id, actor_id, action, entity_type, entity_id, metadata)
  values (reviewer.organisation_id, reviewer.id, 'incident_' || review_action, 'incident_report', target.id,
    jsonb_build_object('status', next_status, 'app_incident_id', selected_app_incident_id));

  return next_status;
end
$$;

revoke all on function public.review_incident_report(text, text, text, jsonb) from public;
revoke all on function public.review_incident_report(text, text, text, jsonb) from anon;
grant execute on function public.review_incident_report(text, text, text, jsonb) to authenticated;
grant select on public.incident_reviews to authenticated;

select pg_notify('pgrst', 'reload schema');
