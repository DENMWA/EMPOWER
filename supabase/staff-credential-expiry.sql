-- Advisory staff credential tracking. Expired credentials warn; they do not block shifts.

create table if not exists public.staff_credentials (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  staff_invite_id uuid not null references public.staff_invites(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  credential_type text not null,
  reference_number text,
  issued_date date,
  expiry_date date not null,
  warning_days integer not null default 30 check (warning_days between 1 and 365),
  status text not null default 'current' check (status in ('current','expired','under_review','waived')),
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_invite_id, credential_type)
);

create index if not exists staff_credentials_org_expiry_idx
  on public.staff_credentials (organisation_id, expiry_date);

alter table public.staff_credentials enable row level security;

drop policy if exists "credential managers view organisation credentials" on public.staff_credentials;
create policy "credential managers view organisation credentials"
on public.staff_credentials for select to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

drop policy if exists "credential managers maintain organisation credentials" on public.staff_credentials;
create policy "credential managers maintain organisation credentials"
on public.staff_credentials for all to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
)
with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
  and exists (
    select 1 from public.staff_invites staff
    where staff.id = staff_invite_id and staff.organisation_id = staff_credentials.organisation_id
  )
);

revoke all on public.staff_credentials from anon;
grant select, insert, update on public.staff_credentials to authenticated;

create or replace function private.audit_staff_credential_change()
returns trigger language plpgsql security definer
set search_path = public, private, pg_temp
as $$
begin
  insert into public.audit_logs (organisation_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    new.organisation_id, (select auth.uid()),
    case when tg_op = 'INSERT' then 'staff_credential_added' else 'staff_credential_updated' end,
    'staff_credential', new.id,
    jsonb_build_object('staff_invite_id', new.staff_invite_id, 'credential_type', new.credential_type, 'expiry_date', new.expiry_date)
  );
  return new;
end;
$$;

revoke all on function private.audit_staff_credential_change() from public, anon, authenticated;
drop trigger if exists audit_staff_credential_changes on public.staff_credentials;
create trigger audit_staff_credential_changes after insert or update on public.staff_credentials
for each row execute function private.audit_staff_credential_change();

select pg_notify('pgrst', 'reload schema');
select to_regclass('public.staff_credentials') as staff_credentials;

