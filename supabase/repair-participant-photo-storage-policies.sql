-- Repair tenant-scoped participant media policies after an object-path name collision.
-- Safe to run repeatedly.
drop policy if exists "users view own organisation participant documents" on storage.objects;
drop policy if exists "users upload own organisation participant documents" on storage.objects;

create policy "users view own organisation participant documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'participant-documents'
  and (storage.foldername(storage.objects.name))[1] = public.current_user_organisation_id()::text
  and exists (
    select 1
    from public.participants_or_clients as participant
    where participant.id::text = (storage.foldername(storage.objects.name))[2]
      and participant.organisation_id = public.current_user_organisation_id()
      and (
        public.current_user_is_manager()
        or (
          public.assigned_to_participant(participant.id)
          and (
            (storage.foldername(storage.objects.name))[3] = 'profile-photo'
            or (storage.foldername(storage.objects.name))[3] like 'shift-note-evidence-%'
          )
        )
      )
  )
);

create policy "users upload own organisation participant documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'participant-documents'
  and (storage.foldername(storage.objects.name))[1] = public.current_user_organisation_id()::text
  and exists (
    select 1
    from public.participants_or_clients as participant
    where participant.id::text = (storage.foldername(storage.objects.name))[2]
      and participant.organisation_id = public.current_user_organisation_id()
      and (
        public.current_user_is_manager()
        or (
          public.assigned_to_participant(participant.id)
          and (storage.foldername(storage.objects.name))[3] like 'shift-note-evidence-%'
        )
      )
  )
);

notify pgrst, 'reload schema';
