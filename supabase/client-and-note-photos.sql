-- Private client profile and shift-note photo references.
-- Files remain in the existing private participant-documents bucket.
-- Safe to run repeatedly.

alter table public.participants_or_clients
  add column if not exists profile_photo_path text;

alter table public.progress_notes
  add column if not exists photo_evidence jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
