-- EmpowerNotes Scheduling, Service Agreements and Native NDIS Invoicing
-- Apply after the core SaaS schema. Keep service_role keys out of client code.

create table if not exists support_shifts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null,
  service_agreement_id uuid,
  title text,
  support_type text,
  location text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text,
  status text not null default 'scheduled',
  recurrence_rule text,
  created_by uuid references users(id) on delete set null,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shift_staff (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  shift_id uuid not null references support_shifts(id) on delete cascade,
  staff_user_id uuid not null references users(id) on delete cascade,
  role text,
  status text not null default 'assigned',
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists shift_notes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  shift_id uuid not null references support_shifts(id) on delete cascade,
  note_id text not null,
  participant_id uuid not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists shift_cancellations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  shift_id uuid not null references support_shifts(id) on delete cascade,
  participant_id uuid not null,
  cancelled_by uuid references users(id) on delete set null,
  cancelled_at timestamptz not null default now(),
  notice_given_at timestamptz,
  reason text,
  billable boolean not null default false,
  billing_review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists ndis_pricing_versions (
  id uuid primary key default gen_random_uuid(),
  version_name text not null,
  effective_from date not null,
  effective_to date,
  source_name text,
  source_url text,
  source_filename text,
  source_file_storage_path text,
  source_file_mime_type text,
  import_method text not null default 'manual',
  imported_by uuid references users(id) on delete set null,
  imported_at timestamptz not null default now(),
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  activated_by uuid references users(id) on delete set null,
  activated_at timestamptz,
  checksum text,
  status text not null default 'draft',
  import_summary jsonb not null default '{}'::jsonb,
  validation_warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ndis_support_items (
  id uuid primary key default gen_random_uuid(),
  pricing_version_id uuid not null references ndis_pricing_versions(id) on delete cascade,
  support_item_number text not null,
  support_item_name text not null,
  registration_group text,
  support_category text,
  unit_type text not null,
  claim_type text,
  time_band text,
  state_or_region text,
  remote_type text,
  price_limit numeric(12,2),
  gst_code text,
  effective_from date not null,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ndis_support_items_version on ndis_support_items(pricing_version_id);
create index if not exists idx_ndis_support_items_number on ndis_support_items(support_item_number);
create index if not exists idx_ndis_support_items_name on ndis_support_items using gin (to_tsvector('english', support_item_name));

create table if not exists ndis_pricing_import_jobs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade,
  requested_by uuid references users(id) on delete set null,
  import_method text not null,
  source_url text,
  source_filename text,
  storage_path text,
  status text not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  error_message text,
  result_pricing_version_id uuid references ndis_pricing_versions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists ndis_pricing_version_diffs (
  id uuid primary key default gen_random_uuid(),
  draft_pricing_version_id uuid not null references ndis_pricing_versions(id) on delete cascade,
  compared_against_version_id uuid references ndis_pricing_versions(id) on delete set null,
  new_items_count integer not null default 0,
  removed_items_count integer not null default 0,
  changed_price_count integer not null default 0,
  changed_name_count integer not null default 0,
  changed_category_count integer not null default 0,
  diff_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists service_agreements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null,
  agreement_name text,
  start_date date not null,
  end_date date,
  billing_frequency text not null default 'fortnightly',
  invoice_recipient_type text not null,
  invoice_recipient_name text,
  invoice_recipient_email text,
  invoice_recipient_address text,
  plan_manager_name text,
  plan_manager_email text,
  status text not null default 'draft',
  created_by uuid references users(id) on delete set null,
  approved_by uuid references users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_agreement_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  service_agreement_id uuid not null references service_agreements(id) on delete cascade,
  participant_id uuid not null,
  ndis_support_item_id uuid references ndis_support_items(id) on delete set null,
  pricing_version_id uuid references ndis_pricing_versions(id) on delete set null,
  support_item_number text not null,
  support_item_name text not null,
  agreed_rate numeric(12,2) not null,
  ndis_price_limit numeric(12,2),
  unit_type text not null,
  budget_category text,
  budget_allocated numeric(12,2),
  allow_travel boolean not null default false,
  allow_kilometres boolean not null default false,
  allow_non_face_to_face boolean not null default false,
  allow_cancellations boolean not null default false,
  start_date date,
  end_date date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists native_invoices (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  participant_id uuid not null,
  invoice_number text not null,
  recipient_name text,
  recipient_email text,
  billing_period_start date not null,
  billing_period_end date not null,
  invoice_date date not null,
  due_date date,
  status text not null default 'draft',
  payment_status text not null default 'unpaid',
  total_amount numeric(12,2) not null default 0,
  created_by uuid references users(id) on delete set null,
  approved_by uuid references users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists native_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  invoice_id uuid not null references native_invoices(id) on delete cascade,
  shift_id uuid references support_shifts(id) on delete set null,
  service_agreement_id uuid references service_agreements(id) on delete set null,
  service_agreement_item_id uuid references service_agreement_items(id) on delete set null,
  participant_id uuid not null,
  service_date date not null,
  support_item_number text not null,
  support_item_name text not null,
  description text,
  quantity numeric(12,2) not null,
  unit_type text not null,
  rate numeric(12,2) not null,
  amount numeric(12,2) not null,
  gst_code text,
  pricing_version_id uuid references ndis_pricing_versions(id) on delete set null,
  pricing_version_name text not null,
  ndis_price_limit_used numeric(12,2),
  agreed_rate_used numeric(12,2) not null,
  evidence_status text not null default 'missing_note',
  price_check_status text not null default 'manual_review_required',
  approval_status text not null default 'draft',
  exception_reason text,
  note_reference text,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_shifts_org_participant on support_shifts(organisation_id, participant_id);
create index if not exists idx_native_invoice_lines_duplicate_check on native_invoice_lines(organisation_id, participant_id, service_date, support_item_number, shift_id);

alter table support_shifts enable row level security;
alter table shift_staff enable row level security;
alter table shift_notes enable row level security;
alter table shift_cancellations enable row level security;
alter table ndis_pricing_import_jobs enable row level security;
alter table service_agreements enable row level security;
alter table service_agreement_items enable row level security;
alter table native_invoices enable row level security;
alter table native_invoice_lines enable row level security;

-- Pricing versions/support items are global reference data after activation.
alter table ndis_pricing_versions enable row level security;
alter table ndis_support_items enable row level security;
alter table ndis_pricing_version_diffs enable row level security;

-- RLS policies should use the project's existing current_user_organisation_id()
-- helper where available. Keep write policies restricted to admin/owner roles.
