-- Private client profile and progress-note photos. Safe to run repeatedly.
insert into storage.buckets (id, name, public)
values ('participant-documents', 'participant-documents', false)
on conflict (id) do update set public = false;

alter table public.participants_or_clients add column if not exists profile_photo_path text;
alter table public.progress_notes add column if not exists photo_evidence jsonb not null default '[]'::jsonb;

drop policy if exists "users view own organisation participant documents" on storage.objects;
drop policy if exists "users upload own organisation participant documents" on storage.objects;
drop policy if exists "users update own organisation participant documents" on storage.objects;
drop policy if exists "managers delete own organisation participant documents" on storage.objects;

create policy "users view own organisation participant documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'participant-documents'
  and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
  and exists (
    select 1 from public.participants_or_clients participant
    where participant.id::text = (storage.foldername(name))[2]
      and participant.organisation_id = public.current_user_organisation_id()
      and (
        public.current_user_is_manager()
        or (
          public.assigned_to_participant(participant.id)
          and (
            (storage.foldername(name))[3] = 'profile-photo'
            or (storage.foldername(name))[3] like 'shift-note-evidence-%'
          )
        )
      )
  )
);

create policy "users upload own organisation participant documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'participant-documents'
  and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
  and exists (
    select 1 from public.participants_or_clients participant
    where participant.id::text = (storage.foldername(name))[2]
      and participant.organisation_id = public.current_user_organisation_id()
      and (
        public.current_user_is_manager()
        or (
          public.assigned_to_participant(participant.id)
          and (storage.foldername(name))[3] like 'shift-note-evidence-%'
        )
      )
  )
);

create policy "users update own organisation participant documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'participant-documents'
  and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
  and public.current_user_is_manager()
)
with check (
  bucket_id = 'participant-documents'
  and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
  and public.current_user_is_manager()
);

create policy "managers delete own organisation participant documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'participant-documents'
  and (storage.foldername(name))[1] = public.current_user_organisation_id()::text
  and public.current_user_is_manager()
);

notify pgrst, 'reload schema';
