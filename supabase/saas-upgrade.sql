-- EmpowerNotes SaaS tenant upgrade.
-- Run this after the original schema if your Supabase project is already set up.

alter table organisations add column if not exists contact_email text;
alter table organisations add column if not exists contact_phone text;
alter table organisations add column if not exists website text;
alter table organisations add column if not exists address text;
alter table organisations add column if not exists provider_number text;
alter table participants_or_clients add column if not exists colour_scheme_id text;

create table if not exists organisation_profiles (
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

create table if not exists staff_invites (
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

alter table staff_invites add column if not exists house_access_mode text not null default 'selected';
alter table staff_invites add column if not exists assigned_house_ids text[] not null default '{}';

create table if not exists retained_records (
  id text not null,
  organisation_id uuid not null references organisations(id) on delete cascade,
  record_type text not null,
  title text not null,
  body text not null,
  saved_by uuid references users(id) on delete set null,
  saved_at timestamptz not null default now(),
  primary key (organisation_id, id)
);

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
  values (new_organisation_id, organisation_name, owner_email, true)
  on conflict (organisation_id) do update set
    organisation_name = excluded.organisation_name,
    email = excluded.email,
    include_in_downloads = true,
    updated_at = now();

  return new_organisation_id;
end;
$$;

grant execute on function create_organisation_for_current_user(text, text, text, provider_type) to authenticated;

alter table organisation_profiles enable row level security;
alter table staff_invites enable row level security;
alter table retained_records enable row level security;

create index if not exists idx_participants_or_clients_organisation_id on participants_or_clients(organisation_id);
create index if not exists idx_staff_invites_organisation_id on staff_invites(organisation_id);
create index if not exists idx_retained_records_organisation_id on retained_records(organisation_id);

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisations' and policyname = 'admins update own organisation') then
    create policy "admins update own organisation" on organisations for update using (
      id = current_user_organisation_id() and current_user_is_manager()
    ) with check (
      id = current_user_organisation_id() and current_user_is_manager()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisation_profiles' and policyname = 'users view own organisation profile') then
    create policy "users view own organisation profile" on organisation_profiles for select using (organisation_id = current_user_organisation_id());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisation_profiles' and policyname = 'admins manage own organisation profile') then
    create policy "admins manage own organisation profile" on organisation_profiles for all using (
      organisation_id = current_user_organisation_id() and current_user_is_manager()
    ) with check (
      organisation_id = current_user_organisation_id() and current_user_is_manager()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'participants_or_clients' and policyname = 'managers create organisation participants') then
    create policy "managers create organisation participants" on participants_or_clients for insert with check (
      organisation_id = current_user_organisation_id() and current_user_is_manager()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'participants_or_clients' and policyname = 'managers update organisation participants') then
    create policy "managers update organisation participants" on participants_or_clients for update using (
      organisation_id = current_user_organisation_id() and current_user_is_manager()
    ) with check (
      organisation_id = current_user_organisation_id() and current_user_is_manager()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff_invites' and policyname = 'managers manage staff invites') then
    create policy "managers manage staff invites" on staff_invites for all using (
      organisation_id = current_user_organisation_id() and current_user_is_manager()
    ) with check (
      organisation_id = current_user_organisation_id() and current_user_is_manager()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'retained_records' and policyname = 'org scoped retained records') then
    create policy "org scoped retained records" on retained_records for select using (
      organisation_id = current_user_organisation_id() and current_user_is_manager()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'retained_records' and policyname = 'users save retained records in own organisation') then
    create policy "users save retained records in own organisation" on retained_records for insert with check (
      organisation_id = current_user_organisation_id()
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'retained_records' and policyname = 'users update retained records in own organisation') then
    create policy "users update retained records in own organisation" on retained_records for update using (
      organisation_id = current_user_organisation_id()
    ) with check (
      organisation_id = current_user_organisation_id()
    );
  end if;
end;
$$;
