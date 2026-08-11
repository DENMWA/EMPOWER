-- EmpowerNotes organisation invitation lifecycle.

create table if not exists public.organisation_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  staff_invite_id uuid references public.staff_invites(id) on delete set null,
  email text not null,
  name text not null,
  role public.user_role not null,
  admin_permissions text[] not null default '{}',
  assigned_participant_ids text[] not null default '{}',
  house_access_mode text not null default 'selected' check (house_access_mode in ('all', 'selected')),
  assigned_house_ids text[] not null default '{}',
  invited_by uuid not null references auth.users(id) on delete restrict,
  auth_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','sent','accepted','expired','revoked','failed')),
  delivery_provider text,
  delivery_reference text,
  error_category text,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organisation_invites_one_open_per_org_email
  on public.organisation_invites (organisation_id, lower(email))
  where status in ('pending', 'sent');

create table if not exists public.organisation_memberships (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null,
  admin_permissions text[] not null default '{}',
  access_status text not null default 'active' check (access_status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, user_id)
);

alter table public.organisation_invites enable row level security;
alter table public.organisation_memberships enable row level security;

revoke all on public.organisation_invites from anon, authenticated;
revoke all on public.organisation_memberships from anon, authenticated;

create index if not exists organisation_invites_org_status_idx on public.organisation_invites (organisation_id, status, created_at desc);
create index if not exists organisation_memberships_user_idx on public.organisation_memberships (user_id, organisation_id);

select pg_notify('pgrst', 'reload schema');
