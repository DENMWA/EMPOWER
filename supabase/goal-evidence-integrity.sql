-- Add the minimum durable Plan-to-Progress goal evidence model when absent,
-- then keep note-to-goal evidence inside one organisation and participant.

create table if not exists public.participant_goals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  participant_id uuid not null references public.participants_or_clients(id) on delete cascade,
  title text not null,
  original_wording text,
  plain_language_description text,
  category text,
  expected_outcome text,
  observable_indicators jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('draft', 'active', 'achieved', 'paused', 'archived')),
  effective_from date,
  target_review_date date,
  created_by uuid references public.users(id) on delete set null,
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_evidence (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  participant_id uuid not null references public.participants_or_clients(id) on delete cascade,
  participant_goal_id uuid not null references public.participant_goals(id) on delete cascade,
  source_type text not null check (source_type in ('progress_note','incident','meal_record','fluid_record','handover','assessment','manager_review','manual_observation')),
  source_id uuid not null,
  evidence_date timestamptz not null,
  evidence_text text not null,
  baseline_comparison text,
  suggested_progress_status text,
  suggested_score numeric,
  ai_confidence_score numeric,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'approved', 'edited', 'rejected')),
  verified_progress_status text,
  verified_score numeric,
  contradiction_flag boolean not null default false,
  contradiction_details text,
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists participant_goals_participant_status_idx
  on public.participant_goals (organisation_id, participant_id, status);

create index if not exists goal_evidence_goal_date_idx
  on public.goal_evidence (organisation_id, participant_goal_id, evidence_date desc);

create unique index if not exists goal_evidence_source_goal_unique
  on public.goal_evidence (participant_goal_id, source_type, source_id);

alter table public.participant_goals enable row level security;
alter table public.goal_evidence enable row level security;

drop policy if exists "participant goals visible by participant access" on public.participant_goals;
create policy "participant goals visible by participant access"
on public.participant_goals for select to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and (public.current_user_is_manager() or public.assigned_to_participant(participant_id))
);

drop policy if exists "managers maintain participant goals" on public.participant_goals;
create policy "managers maintain participant goals"
on public.participant_goals for all to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
)
with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

drop policy if exists "goal evidence visible by participant access" on public.goal_evidence;
create policy "goal evidence visible by participant access"
on public.goal_evidence for select to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and (public.current_user_is_manager() or public.assigned_to_participant(participant_id))
);

drop policy if exists "users create pending goal evidence" on public.goal_evidence;
create policy "users create pending goal evidence"
on public.goal_evidence for insert to authenticated
with check (
  organisation_id = public.current_user_organisation_id()
  and verification_status = 'pending'
  and (public.current_user_is_manager() or public.assigned_to_participant(participant_id))
);

drop policy if exists "managers review goal evidence" on public.goal_evidence;
create policy "managers review goal evidence"
on public.goal_evidence for update to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
)
with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

revoke all on public.participant_goals, public.goal_evidence from anon;
grant select, insert, update on public.participant_goals to authenticated;
grant select, insert, update on public.goal_evidence to authenticated;

create or replace function private.validate_goal_evidence_source()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not exists (
    select 1 from public.participant_goals goal
    where goal.id = new.participant_goal_id
      and goal.organisation_id = new.organisation_id
      and goal.participant_id = new.participant_id
      and goal.status = 'active'
  ) then
    raise exception 'Goal evidence must reference an active goal for the same participant and organisation.' using errcode = '23514';
  end if;

  if new.source_type = 'progress_note' and not exists (
    select 1 from public.progress_notes note
    where note.id = new.source_id
      and note.organisation_id = new.organisation_id
      and note.participant_id = new.participant_id
      and note.status <> 'Draft'
  ) then
    raise exception 'Goal evidence must reference a submitted note for the same participant and organisation.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_goal_evidence_source() from public, anon, authenticated;

drop trigger if exists validate_goal_evidence_source_trigger on public.goal_evidence;
create trigger validate_goal_evidence_source_trigger
before insert or update on public.goal_evidence
for each row execute function private.validate_goal_evidence_source();

select
  to_regclass('public.participant_goals') as participant_goals,
  to_regclass('public.goal_evidence') as goal_evidence;
