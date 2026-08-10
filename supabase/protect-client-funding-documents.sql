-- Restrict workers to approved direct-care documents and assigned clients.
-- Safe to run repeatedly after the core EmpowerNotes schema.

create or replace function public.is_worker_care_document_type(document_type text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select lower(trim(document_type)) = any(array[
    'chap',
    'medical report',
    'medication support plan',
    'behaviour support plan',
    'risk assessment',
    'communication profile',
    'occupational therapy report',
    'physiotherapy report',
    'speech pathology report',
    'psychology report',
    'behaviour support practitioner report',
    'dietitian report',
    'exercise physiology report',
    'podiatry report',
    'nursing assessment report',
    'direct care implementation guide'
  ]::text[])
$$;

revoke all on function public.is_worker_care_document_type(text) from public;
revoke all on function public.is_worker_care_document_type(text) from anon;
grant execute on function public.is_worker_care_document_type(text) to authenticated;

create or replace function public.safe_document_participant_id(value text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end
$$;

revoke all on function public.safe_document_participant_id(text) from public;
revoke all on function public.safe_document_participant_id(text) from anon;
grant execute on function public.safe_document_participant_id(text) to authenticated;

create or replace function public.enforce_worker_document_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_is_manager() then
    if new.uploaded_by <> (select auth.uid())
      or new.organisation_id <> public.current_user_organisation_id()
      or not public.assigned_to_participant(new.participant_id)
      or new.visibility <> 'worker-visible'
      or not public.is_worker_care_document_type(new.document_type)
      or coalesce(new.manager_verified, false)
    then
      raise exception 'Workers may upload only approved direct-care documents for assigned clients.' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists enforce_worker_document_scope_trigger on public.documents;
create trigger enforce_worker_document_scope_trigger
before insert or update on public.documents
for each row execute function public.enforce_worker_document_scope();

drop policy if exists "document access respects visibility" on public.documents;
create policy "document access respects visibility"
on public.documents
for select
to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and (
    public.current_user_is_manager()
    or (
      visibility = 'worker-visible'
      and public.is_worker_care_document_type(document_type)
      and public.assigned_to_participant(participant_id)
    )
  )
);

drop policy if exists "users upload documents for assigned clients" on public.documents;
create policy "users upload documents for assigned clients"
on public.documents
for insert
to authenticated
with check (
  organisation_id = public.current_user_organisation_id()
  and uploaded_by = (select auth.uid())
  and (
    public.current_user_is_manager()
    or (
      visibility = 'worker-visible'
      and public.is_worker_care_document_type(document_type)
      and public.assigned_to_participant(participant_id)
    )
  )
);

drop policy if exists "users update uploaded direct care documents" on public.documents;
create policy "users update uploaded direct care documents"
on public.documents
for update
to authenticated
using (
  organisation_id = public.current_user_organisation_id()
  and (
    public.current_user_is_manager()
    or (
      uploaded_by = (select auth.uid())
      and visibility = 'worker-visible'
      and public.is_worker_care_document_type(document_type)
      and public.assigned_to_participant(participant_id)
    )
  )
)
with check (
  organisation_id = public.current_user_organisation_id()
  and (
    public.current_user_is_manager()
    or (
      uploaded_by = (select auth.uid())
      and visibility = 'worker-visible'
      and public.is_worker_care_document_type(document_type)
      and public.assigned_to_participant(participant_id)
      and not manager_verified
    )
  )
);

create or replace function public.worker_can_access_participant_file(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select
    (storage.foldername(object_name))[1] = public.current_user_organisation_id()::text
    and public.safe_document_participant_id((storage.foldername(object_name))[2]) is not null
    and public.assigned_to_participant(public.safe_document_participant_id((storage.foldername(object_name))[2]))
    and (
      (storage.foldername(object_name))[3] = 'profile-photo'
      or (storage.foldername(object_name))[3] like 'shift-note-evidence-%'
      or exists (
        select 1
        from public.documents document
        where document.organisation_id = public.current_user_organisation_id()
          and document.participant_id = public.safe_document_participant_id((storage.foldername(object_name))[2])
          and document.file_path = object_name
          and document.visibility = 'worker-visible'
          and public.is_worker_care_document_type(document.document_type)
      )
    )
$$;

create or replace function public.worker_can_upload_participant_file(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select
    public.worker_can_access_participant_file(object_name)
    and (
      (storage.foldername(object_name))[3] like 'shift-note-evidence-%'
      or exists (
        select 1
        from public.documents document
        where document.file_path = object_name
          and document.uploaded_by = (select auth.uid())
          and document.visibility = 'worker-visible'
          and public.is_worker_care_document_type(document.document_type)
      )
    )
$$;

revoke all on function public.worker_can_access_participant_file(text) from public;
revoke all on function public.worker_can_access_participant_file(text) from anon;
revoke all on function public.worker_can_upload_participant_file(text) from public;
revoke all on function public.worker_can_upload_participant_file(text) from anon;
grant execute on function public.worker_can_access_participant_file(text) to authenticated;
grant execute on function public.worker_can_upload_participant_file(text) to authenticated;

drop policy if exists "users view own organisation participant documents" on storage.objects;
create policy "users view own organisation participant documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'participant-documents'
  and (public.current_user_is_manager() or public.worker_can_access_participant_file(name))
);

drop policy if exists "users upload own organisation participant documents" on storage.objects;
create policy "users upload own organisation participant documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'participant-documents'
  and (
    (
      public.current_user_is_manager()
      and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
    )
    or public.worker_can_upload_participant_file(name)
  )
);

drop policy if exists "users update own organisation participant documents" on storage.objects;
create policy "users update own organisation participant documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'participant-documents'
  and (
    (
      public.current_user_is_manager()
      and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
    )
    or public.worker_can_upload_participant_file(name)
  )
)
with check (
  bucket_id = 'participant-documents'
  and (
    (
      public.current_user_is_manager()
      and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
    )
    or public.worker_can_upload_participant_file(name)
  )
);

select pg_notify('pgrst', 'reload schema');
