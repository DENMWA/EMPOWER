-- Tenant-scoped, deduplicated document expiry notifications.
create table if not exists public.document_expiry_notifications (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  participant_id uuid not null references public.participants_or_clients(id) on delete cascade,
  reminder_stage text not null check (reminder_stage in ('30_days','14_days','expired','overdue')),
  expiry_date date not null,
  title text not null,
  message text not null,
  email_sent_at timestamptz null,
  email_recipients text[] not null default '{}',
  acknowledged_at timestamptz null,
  acknowledged_by uuid null references public.users(id),
  created_at timestamptz not null default now(),
  unique (organisation_id, document_id, reminder_stage, expiry_date)
);
create index if not exists idx_document_expiry_notifications_org_open on public.document_expiry_notifications (organisation_id, acknowledged_at, created_at desc);
alter table public.document_expiry_notifications enable row level security;
drop policy if exists "document managers view expiry notifications" on public.document_expiry_notifications;
create policy "document managers view expiry notifications" on public.document_expiry_notifications for select to authenticated
using (organisation_id=public.current_user_organisation_id() and (public.current_user_is_manager() or exists(select 1 from public.users u where u.id=auth.uid() and 'documents'=any(coalesce(u.admin_permissions,'{}'::text[])))));
drop policy if exists "document managers acknowledge expiry notifications" on public.document_expiry_notifications;
create policy "document managers acknowledge expiry notifications" on public.document_expiry_notifications for update to authenticated
using (organisation_id=public.current_user_organisation_id() and (public.current_user_is_manager() or exists(select 1 from public.users u where u.id=auth.uid() and 'documents'=any(coalesce(u.admin_permissions,'{}'::text[])))))
with check (organisation_id=public.current_user_organisation_id() and (acknowledged_by is null or acknowledged_by=auth.uid()));
grant select, update on public.document_expiry_notifications to authenticated;
revoke insert, delete on public.document_expiry_notifications from anon, authenticated;
select pg_notify('pgrst','reload schema');
