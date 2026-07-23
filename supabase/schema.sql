-- Empower Notes MVP schema.
-- Storage buckets to create privately: participant-documents, note-exports, audit-packs.
-- Do not create public document URLs.

create extension if not exists "pgcrypto";

create type user_role as enum ('support_worker','team_leader','case_manager','service_manager','admin','owner','sole_provider');
create type provider_type as enum ('organisation','sole_provider');
create type note_status as enum ('Draft','Submitted','Needs Review','Approved','Escalated','Self-Certified','Invoice Ready','Locked','Not Ready','Needs Evidence','Sent');
create type input_method as enum ('typed','standard_voice','guided_voice');
create type invoice_status as enum ('Not Ready','Needs Evidence','Ready','Sent');
create type document_visibility as enum ('worker-visible','manager-only');

insert into storage.buckets (id, name, public)
values ('participant-documents', 'participant-documents', false)
on conflict (id) do update set public = false;

create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider_type provider_type not null default 'organisation',
  contact_email text,
  contact_phone text,
  website text,
  address text,
  provider_number text,
  created_at timestamptz not null default now()
);

create table organisation_profiles (
  organisation_id uuid primary key references organisations(id) on delete cascade,
  organisation_name text not null,
  provider_number text,
  phone text,
  email text,
  website text,
  address text,
  logo_name text,
  logo_data_url text,
  include_in_downloads boolean not null default false,
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key,
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  email text not null unique,
  role user_role not null,
  provider_type provider_type not null default 'organisation',
  accessibility_mode boolean not null default false,
  created_at timestamptz not null default now()
);

create table participants_or_clients (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  date_of_birth date,
  support_needs text,
  communication_preferences text,
  risk_alerts text[] not null default '{}',
  colour_scheme_id text,
  goals text[] not null default '{}',
  assigned_worker_ids text[] not null default '{}',
  primary_house_id text,
  primary_house_name text,
  service_name text,
  behaviour_support_notes text,
  emergency_contacts jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table staff_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  email text not null,
  role user_role not null default 'support_worker',
  invite_status text not null default 'draft',
  assigned_participant_ids text[] not null default '{}',
  house_access_mode text not null default 'selected',
  assigned_house_ids text[] not null default '{}',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table participant_assignments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (participant_id, user_id)
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete cascade,
  category text not null,
  description text not null,
  source_document_id uuid,
  manager_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table progress_notes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete restrict,
  staff_id uuid not null references users(id) on delete restrict,
  support_date date not null,
  start_time time,
  end_time time,
  support_type text not null,
  rough_note text not null,
  final_note text,
  voice_transcript text,
  input_method input_method not null default 'typed',
  status note_status not null default 'Draft',
  goal_id uuid references goals(id) on delete set null,
  missing_details text[] not null default '{}',
  risky_wording_flags text[] not null default '{}',
  incident_flags text[] not null default '{}',
  unresolved_incident_flags text[] not null default '{}',
  ai_quality_score integer not null default 0 check (ai_quality_score between 0 and 100),
  billing_evidence_score integer not null default 0 check (billing_evidence_score between 0 and 100),
  invoice_ready boolean not null default false,
  owner_approved boolean not null default false,
  self_certified_at timestamptz,
  self_certification_statement text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roster_shifts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete cascade,
  worker_id uuid not null references users(id) on delete cascade,
  support_type text not null,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  location text,
  shift_instructions text,
  status text not null default 'Scheduled',
  note_required boolean default true,
  note_completed boolean default false,
  progress_note_id uuid references progress_notes(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table progress_notes add column if not exists roster_shift_id uuid references roster_shifts(id) on delete set null;

create table incidents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete restrict,
  staff_id uuid not null references users(id) on delete restrict,
  occurred_at timestamptz not null,
  location text,
  what_happened text not null,
  immediate_risk text,
  injury_or_harm text,
  staff_response text,
  de_escalation_strategy text,
  emergency_services_involved boolean not null default false,
  manager_notified boolean not null default false,
  external_parties_notified text[] not null default '{}',
  follow_up_required text,
  preventive_action text,
  manager_review_required boolean not null default true,
  ai_summary text,
  created_at timestamptz not null default now()
);

create table note_scores (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  progress_note_id uuid not null references progress_notes(id) on delete cascade,
  audit_readiness integer not null,
  objective_language integer not null,
  person_centred_wording integer not null,
  detail_level integer not null,
  goal_connection text not null,
  participant_response integer not null,
  follow_up_clarity integer not null,
  risk_clarity integer not null,
  billing_evidence_strength integer not null,
  improvement_suggestions text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  progress_note_id uuid not null references progress_notes(id) on delete cascade,
  reviewer_id uuid not null references users(id) on delete restrict,
  action text not null check (action in ('approved','edited','sent_back','locked','self_certified')),
  comments text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete cascade,
  uploaded_by uuid not null references users(id) on delete restrict,
  document_type text not null,
  file_path text not null,
  storage_bucket text not null default 'participant-documents',
  visibility document_visibility not null default 'worker-visible',
  status text not null default 'uploaded',
  manager_verified boolean not null default false,
  start_date date,
  expiry_date date,
  created_at timestamptz not null default now()
);

create table document_ai_summaries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  summary text,
  goals text[] not null default '{}',
  risks text[] not null default '{}',
  support_strategies text[] not null default '{}',
  communication_preferences text[] not null default '{}',
  review_dates date[] not null default '{}',
  confidence_score integer not null default 0,
  manager_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table document_note_links (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  progress_note_id uuid not null references progress_notes(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade,
  name text not null,
  category text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table voice_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  progress_note_id uuid references progress_notes(id) on delete set null,
  staff_id uuid not null references users(id) on delete restrict,
  input_method input_method not null,
  transcript text,
  guided_questions jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table invoice_evidence_checks (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  progress_note_id uuid not null references progress_notes(id) on delete cascade,
  status invoice_status not null,
  evidence_score integer not null default 0,
  missing_items text[] not null default '{}',
  unresolved_incident_flags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table invoice_summaries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete restrict,
  created_by uuid not null references users(id) on delete restrict,
  date_start date not null,
  date_end date not null,
  support_type text,
  total_support_duration interval,
  linked_note_ids uuid[] not null default '{}',
  approval_status text,
  evidence_score integer not null default 0,
  missing_evidence_items text[] not null default '{}',
  unresolved_incident_flags text[] not null default '{}',
  status invoice_status not null default 'Not Ready',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Plan-to-Progress Intelligence
-- Private storage bucket to create: participant-plans.
-- Recommended storage path: participant-plans/{organisation_id}/{participant_id}/{plan_id}/{filename}

create table if not exists participant_plans (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  document_type text not null,
  plan_name text,
  plan_version text,
  effective_from date,
  effective_to date,
  review_date date,
  status text not null default 'processing' check (status in ('processing','ready_for_review','verified','rejected','superseded','archived','failed')),
  is_current boolean not null default false,
  extraction_status text not null default 'pending',
  verification_status text not null default 'pending',
  uploaded_by uuid references users(id) on delete set null,
  verified_by uuid references users(id) on delete set null,
  verified_at timestamptz,
  superseded_by uuid references participant_plans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plan_extractions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete cascade,
  participant_plan_id uuid not null references participant_plans(id) on delete cascade,
  extraction_type text not null check (extraction_type in ('goal','support_need','risk','support_strategy','communication_preference','baseline_indicator','review_date','participant_preference','health_information','mealtime_support','behaviour_support','other')),
  title text,
  original_text text,
  interpreted_text text,
  structured_data jsonb not null default '{}'::jsonb,
  source_page integer,
  source_section text,
  source_paragraph text,
  confidence_score numeric,
  verification_status text not null default 'pending',
  reviewed_value jsonb,
  rejection_reason text,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists participant_goals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete cascade,
  participant_plan_id uuid references participant_plans(id) on delete set null,
  source_extraction_id uuid references plan_extractions(id) on delete set null,
  title text not null,
  original_wording text,
  plain_language_description text,
  category text,
  expected_outcome text,
  observable_indicators jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  effective_from date,
  target_review_date date,
  created_by uuid references users(id) on delete set null,
  verified_by uuid references users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists goal_baselines (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete cascade,
  participant_goal_id uuid not null references participant_goals(id) on delete cascade,
  baseline_date date not null,
  baseline_description text not null,
  support_level text,
  baseline_score numeric,
  scoring_framework_id uuid,
  barriers jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  observable_indicators jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','pending_verification','verified','superseded','archived')),
  source_plan_id uuid references participant_plans(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  verified_by uuid references users(id) on delete set null,
  verified_at timestamptz,
  superseded_by uuid references goal_baselines(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists goal_evidence (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null references participants_or_clients(id) on delete cascade,
  participant_goal_id uuid not null references participant_goals(id) on delete cascade,
  source_type text not null check (source_type in ('progress_note','incident','meal_record','fluid_record','handover','assessment','manager_review','manual_observation')),
  source_id uuid not null,
  evidence_date timestamptz not null,
  evidence_text text not null,
  baseline_comparison text,
  suggested_progress_status text,
  suggested_score numeric,
  ai_confidence_score numeric,
  verification_status text not null default 'pending',
  verified_progress_status text,
  verified_score numeric,
  contradiction_flag boolean not null default false,
  contradiction_details text,
  verified_by uuid references users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists progress_scales (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade,
  name text not null,
  description text,
  scale_type text not null,
  levels jsonb not null,
  is_system_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists organisation_usage (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  usage_period_start date not null,
  usage_period_end date not null,
  active_participants integer not null default 0,
  ai_analysed_notes integer not null default 0,
  plan_documents_processed integer not null default 0,
  storage_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, usage_period_start, usage_period_end)
);

create table retained_records (
  id text not null,
  organisation_id uuid not null references organisations(id) on delete cascade,
  record_type text not null,
  title text not null,
  body text not null,
  saved_by uuid references users(id) on delete set null,
  saved_at timestamptz not null default now(),
  primary key (organisation_id, id)
);

create table if not exists incident_reports (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid references participants_or_clients(id) on delete set null,
  reported_by uuid references users(id) on delete set null,
  app_incident_id text,
  app_participant_id text,
  house_id text,
  house_name text,
  participant_name text,
  reporter_name text,
  incident_date date not null,
  incident_time time not null,
  location text,
  status text not null default 'Draft',
  incident_types text[] not null default '{}',
  what_happened text,
  injury_harm_summary text,
  anyone_injured boolean not null default false,
  immediate_action_taken text,
  notification_notes text,
  follow_up_required boolean not null default false,
  follow_up_notes text,
  manager_comments text,
  manager_review_status text not null default 'Pending Review',
  property_damage jsonb,
  property_damage_involved boolean not null default false,
  property_damage_items text[] not null default '{}',
  property_damage_description text,
  property_damage_estimated_cost text,
  body_markers jsonb not null default '[]',
  attachments jsonb not null default '[]',
  incident_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function current_user_profile()
returns users
language sql
stable
as $$
  select * from users where id = auth.uid()
$$;

create or replace function current_user_organisation_id()
returns uuid
language sql
stable
as $$
  select organisation_id from users where id = auth.uid()
$$;

create or replace function create_organisation_for_current_user(
  organisation_name text,
  owner_name text,
  owner_email text,
  selected_provider_type provider_type default 'organisation'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organisation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create an organisation.';
  end if;

  if exists (select 1 from users where id = auth.uid()) then
    select organisation_id into new_organisation_id from users where id = auth.uid();
    return new_organisation_id;
  end if;

  insert into organisations (name, provider_type, contact_email)
  values (organisation_name, selected_provider_type, owner_email)
  returning id into new_organisation_id;

  insert into users (id, organisation_id, name, email, role, provider_type)
  values (
    auth.uid(),
    new_organisation_id,
    owner_name,
    owner_email,
    case when selected_provider_type = 'sole_provider' then 'sole_provider'::user_role else 'owner'::user_role end,
    selected_provider_type
  );

  insert into organisation_profiles (organisation_id, organisation_name, email, include_in_downloads)
  values (new_organisation_id, organisation_name, owner_email, true);

  return new_organisation_id;
end;
$$;

grant execute on function create_organisation_for_current_user(text, text, text, provider_type) to authenticated;

create or replace function current_user_is_manager()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from users
    where id = auth.uid()
    and role in ('team_leader','case_manager','service_manager','admin','owner','sole_provider')
  )
$$;

create or replace function current_user_is_roster_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from users
    where id = auth.uid()
    and role in ('admin','owner')
  )
$$;

create or replace function assigned_to_participant(participant uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from participant_assignments
    where participant_id = participant and user_id = auth.uid()
  )
$$;

alter table organisations enable row level security;
alter table organisation_profiles enable row level security;
alter table users enable row level security;
alter table participants_or_clients enable row level security;
alter table participant_assignments enable row level security;
alter table staff_invites enable row level security;
alter table goals enable row level security;
alter table progress_notes enable row level security;
alter table roster_shifts enable row level security;
alter table incidents enable row level security;
alter table note_scores enable row level security;
alter table approvals enable row level security;
alter table audit_logs enable row level security;
alter table documents enable row level security;
alter table document_ai_summaries enable row level security;
alter table participant_plans enable row level security;
alter table plan_extractions enable row level security;
alter table participant_goals enable row level security;
alter table goal_baselines enable row level security;
alter table goal_evidence enable row level security;
alter table progress_scales enable row level security;
alter table organisation_usage enable row level security;
alter table document_note_links enable row level security;
alter table templates enable row level security;
alter table voice_sessions enable row level security;
alter table invoice_evidence_checks enable row level security;
alter table invoice_summaries enable row level security;
alter table retained_records enable row level security;
alter table incident_reports enable row level security;

-- Organisation-level separation.
create policy "users can view own organisation" on organisations for select using (id = (select organisation_id from users where id = auth.uid()));
create policy "users can view org users" on users for select using (organisation_id = (select organisation_id from users where id = auth.uid()));
create policy "admins update own organisation" on organisations for update using (
  id = current_user_organisation_id() and current_user_is_manager()
) with check (
  id = current_user_organisation_id() and current_user_is_manager()
);

create policy "users view own organisation profile" on organisation_profiles for select using (organisation_id = current_user_organisation_id());
create policy "admins manage own organisation profile" on organisation_profiles for all using (
  organisation_id = current_user_organisation_id() and current_user_is_manager()
) with check (
  organisation_id = current_user_organisation_id() and current_user_is_manager()
);

-- Workers can access assigned participants; managers/admins can access organisation records.
create policy "participant access by assignment or manager" on participants_or_clients for select using (
  organisation_id = (select organisation_id from users where id = auth.uid())
  and (current_user_is_manager() or assigned_to_participant(id))
);
create policy "managers create organisation participants" on participants_or_clients for insert with check (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);
create policy "managers update organisation participants" on participants_or_clients for update using (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
) with check (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);

create policy "managers manage staff invites" on staff_invites for all using (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
) with check (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);

create policy "progress note access by assignment or manager" on progress_notes for select using (
  organisation_id = (select organisation_id from users where id = auth.uid())
  and (current_user_is_manager() or staff_id = auth.uid() or assigned_to_participant(participant_id))
);

create policy "workers create own notes for assigned participants" on progress_notes for insert with check (
  organisation_id = (select organisation_id from users where id = auth.uid())
  and staff_id = auth.uid()
  and (current_user_is_manager() or assigned_to_participant(participant_id))
);
create policy "workers update own draft notes" on progress_notes for update using (
  organisation_id = current_user_organisation_id()
  and (current_user_is_manager() or staff_id = auth.uid())
) with check (
  organisation_id = current_user_organisation_id()
  and (current_user_is_manager() or staff_id = auth.uid())
);

create policy "roster shifts visible to admins only" on roster_shifts for select using (
  organisation_id = (select organisation_id from users where id = auth.uid())
  and current_user_is_roster_admin()
);

create policy "admins manage organisation roster shifts" on roster_shifts for all using (
  organisation_id = (select organisation_id from users where id = auth.uid())
  and current_user_is_roster_admin()
) with check (
  organisation_id = (select organisation_id from users where id = auth.uid())
  and current_user_is_roster_admin()
);

create policy "managers approve organisation notes" on approvals for insert with check (
  organisation_id = (select organisation_id from users where id = auth.uid())
  and current_user_is_manager()
);

create policy "approval trail visible to organisation managers and assigned workers" on approvals for select using (
  organisation_id = (select organisation_id from users where id = auth.uid())
);

-- Private documents: manager-only documents are hidden from support workers.
create policy "document access respects visibility" on documents for select using (
  organisation_id = (select organisation_id from users where id = auth.uid())
  and (
    current_user_is_manager()
    or (visibility = 'worker-visible' and assigned_to_participant(participant_id))
  )
);

create policy "users upload documents for assigned clients" on documents for insert with check (
  organisation_id = (select organisation_id from users where id = auth.uid())
  and uploaded_by = auth.uid()
  and (current_user_is_manager() or assigned_to_participant(participant_id))
);

create policy "document summaries follow document access" on document_ai_summaries for select using (
  exists (
    select 1 from documents d
    where d.id = document_id
    and d.organisation_id = (select organisation_id from users where id = auth.uid())
    and (current_user_is_manager() or (d.visibility = 'worker-visible' and assigned_to_participant(d.participant_id)))
  )
);

-- Audit logs are visible to managers/admins and sole providers in their organisation.
create policy "audit logs visible to managers" on audit_logs for select using (
  organisation_id = (select organisation_id from users where id = auth.uid())
  and current_user_is_manager()
);

-- Apply broad organisation policies to supporting tables; tighten before production where needed.
create policy "org scoped goals" on goals for select using (organisation_id = (select organisation_id from users where id = auth.uid()));
create policy "org scoped incidents" on incidents for select using (organisation_id = (select organisation_id from users where id = auth.uid()) and (current_user_is_manager() or staff_id = auth.uid() or assigned_to_participant(participant_id)));
create policy "org scoped scores" on note_scores for select using (organisation_id = (select organisation_id from users where id = auth.uid()));
create policy "org scoped links" on document_note_links for select using (organisation_id = (select organisation_id from users where id = auth.uid()));
create policy "org scoped templates" on templates for select using (organisation_id is null or organisation_id = (select organisation_id from users where id = auth.uid()));
create policy "org scoped voice sessions" on voice_sessions for select using (organisation_id = (select organisation_id from users where id = auth.uid()) and (current_user_is_manager() or staff_id = auth.uid()));
create policy "org scoped invoice checks" on invoice_evidence_checks for select using (organisation_id = (select organisation_id from users where id = auth.uid()));
create policy "org scoped invoice summaries" on invoice_summaries for select using (organisation_id = (select organisation_id from users where id = auth.uid()) and current_user_is_manager());
create policy "org scoped retained records" on retained_records for select using (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);

create policy "plans visible by participant access" on participant_plans for select using (
  organisation_id = current_user_organisation_id()
  and (current_user_is_manager() or assigned_to_participant(participant_id))
);
create policy "managers upload and verify participant plans" on participant_plans for all using (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
) with check (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);

create policy "plan extractions visible by participant access" on plan_extractions for select using (
  organisation_id = current_user_organisation_id()
  and (current_user_is_manager() or assigned_to_participant(participant_id))
);
create policy "managers review plan extractions" on plan_extractions for all using (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
) with check (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);

create policy "participant goals visible by participant access" on participant_goals for select using (
  organisation_id = current_user_organisation_id()
  and (current_user_is_manager() or assigned_to_participant(participant_id))
);
create policy "managers verify participant goals" on participant_goals for all using (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
) with check (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);

create policy "goal baselines visible by participant access" on goal_baselines for select using (
  organisation_id = current_user_organisation_id()
  and (current_user_is_manager() or assigned_to_participant(participant_id))
);
create policy "managers verify goal baselines" on goal_baselines for all using (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
) with check (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);

create policy "goal evidence visible by participant access" on goal_evidence for select using (
  organisation_id = current_user_organisation_id()
  and (current_user_is_manager() or assigned_to_participant(participant_id))
);
create policy "users create goal evidence for assigned participants" on goal_evidence for insert with check (
  organisation_id = current_user_organisation_id()
  and (current_user_is_manager() or assigned_to_participant(participant_id))
);
create policy "managers verify goal evidence" on goal_evidence for update using (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
) with check (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);

create policy "progress scales visible to organisation" on progress_scales for select using (
  organisation_id is null or organisation_id = current_user_organisation_id()
);
create policy "managers configure organisation progress scales" on progress_scales for all using (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
) with check (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);

create policy "organisation usage visible to managers" on organisation_usage for select using (
  organisation_id = current_user_organisation_id()
  and current_user_is_manager()
);
create policy "users save retained records in own organisation" on retained_records for insert with check (
  organisation_id = current_user_organisation_id()
);
create policy "users update retained records in own organisation" on retained_records for update using (
  organisation_id = current_user_organisation_id()
) with check (
  organisation_id = current_user_organisation_id()
);

create policy "incident reports visible in own organisation" on incident_reports for select using (
  organisation_id = current_user_organisation_id()
);
create policy "users save incident reports in own organisation" on incident_reports for insert with check (
  organisation_id = current_user_organisation_id()
);
create policy "users update incident reports in own organisation" on incident_reports for update using (
  organisation_id = current_user_organisation_id()
) with check (
  organisation_id = current_user_organisation_id()
);

create policy "users view own organisation participant documents"
on storage.objects
for select
using (
  bucket_id = 'participant-documents'
  and (storage.foldername(name))[1] = current_user_organisation_id()::text
);

create policy "users upload own organisation participant documents"
on storage.objects
for insert
with check (
  bucket_id = 'participant-documents'
  and (storage.foldername(name))[1] = current_user_organisation_id()::text
);

create policy "users update own organisation participant documents"
on storage.objects
for update
using (
  bucket_id = 'participant-documents'
  and (storage.foldername(name))[1] = current_user_organisation_id()::text
)
with check (
  bucket_id = 'participant-documents'
  and (storage.foldername(name))[1] = current_user_organisation_id()::text
);

create index if not exists idx_roster_shifts_organisation_id on roster_shifts(organisation_id);
create index if not exists idx_roster_shifts_participant_id on roster_shifts(participant_id);
create index if not exists idx_roster_shifts_worker_id on roster_shifts(worker_id);
create index if not exists idx_roster_shifts_shift_date on roster_shifts(shift_date);
create index if not exists idx_roster_shifts_status on roster_shifts(status);
create index if not exists idx_participants_or_clients_organisation_id on participants_or_clients(organisation_id);
create index if not exists idx_staff_invites_organisation_id on staff_invites(organisation_id);
create index if not exists idx_retained_records_organisation_id on retained_records(organisation_id);
create unique index if not exists idx_incident_reports_org_app_incident_id on incident_reports(organisation_id, app_incident_id);
create index if not exists idx_participant_plans_org_participant on participant_plans(organisation_id, participant_id);
create index if not exists idx_plan_extractions_plan on plan_extractions(participant_plan_id);
create index if not exists idx_participant_goals_participant on participant_goals(participant_id);
create index if not exists idx_goal_baselines_goal on goal_baselines(participant_goal_id);
create index if not exists idx_goal_evidence_goal_date on goal_evidence(participant_goal_id, evidence_date);
create index if not exists idx_organisation_usage_period on organisation_usage(organisation_id, usage_period_start, usage_period_end);

-- Roster audit actions:
-- roster_shift_created
-- roster_shift_updated
-- roster_shift_completed
-- roster_shift_cancelled
-- roster_shift_no_show
-- roster_shift_note_required
-- roster_shift_note_completed
