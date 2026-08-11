-- Preserve the complete advisory AI quality assessment for manager review and audit workflows.
-- This is additive and does not change note saving, approval, or RLS behaviour.
alter table public.progress_notes
  add column if not exists quality_breakdown jsonb;

comment on column public.progress_notes.quality_breakdown is
  'Advisory note-quality category snapshot captured when the note was submitted. Never used to block draft saving.';

select pg_notify('pgrst', 'reload schema');
