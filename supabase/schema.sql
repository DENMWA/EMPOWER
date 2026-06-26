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

create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider_type provider_type not null default 'organisation',
  created_at timestamptz not null default now()
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
  behaviour_support_notes text,
  emergency_contacts jsonb not null default '[]',
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

create or replace function current_user_profile()
returns users
language sql
stable
as $$
  select * from users where id = auth.uid()
$$;

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
alter table users enable row level security;
alter table participants_or_clients enable row level security;
alter table participant_assignments enable row level security;
alter table goals enable row level security;
alter table progress_notes enable row level security;
alter table incidents enable row level security;
alter table note_scores enable row level security;
alter table approvals enable row level security;
alter table audit_logs enable row level security;
alter table documents enable row level security;
alter table document_ai_summaries enable row level security;
alter table document_note_links enable row level security;
alter table templates enable row level security;
alter table voice_sessions enable row level security;
alter table invoice_evidence_checks enable row level security;
alter table invoice_summaries enable row level security;

-- Organisation-level separation.
create policy "users can view own organisation" on organisations for select using (id = (select organisation_id from users where id = auth.uid()));
create policy "users can view org users" on users for select using (organisation_id = (select organisation_id from users where id = auth.uid()));

-- Workers can access assigned participants; managers/admins can access organisation records.
create policy "participant access by assignment or manager" on participants_or_clients for select using (
  organisation_id = (select organisation_id from users where id = auth.uid())
  and (current_user_is_manager() or assigned_to_participant(id))
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
