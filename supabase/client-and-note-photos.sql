-- Private client profile and shift-note photo references.
-- Creates the private participant-documents bucket when an older project
-- has the database tables but has not yet been configured for file storage.
-- Safe to run repeatedly.

insert into storage.buckets (id, name, public)
values ('participant-documents', 'participant-documents', false)
on conflict (id) do update set public = false;

alter table public.participants_or_clients
  add column if not exists profile_photo_path text;

alter table public.progress_notes
  add column if not exists photo_evidence jsonb not null default '[]'::jsonb;

do $policies$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'users view own organisation participant documents'
  ) then
    create policy "users view own organisation participant documents"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'participant-documents'
        and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'users upload own organisation participant documents'
  ) then
    create policy "users upload own organisation participant documents"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'participant-documents'
        and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'users update own organisation participant documents'
  ) then
    create policy "users update own organisation participant documents"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'participant-documents'
        and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
      )
      with check (
        bucket_id = 'participant-documents'
        and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
      );
  end if;
end
$policies$;

notify pgrst, 'reload schema';
