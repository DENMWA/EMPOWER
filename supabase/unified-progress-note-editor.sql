-- Preserve worker input and editor versions while keeping the existing progress-note workflow.
alter type public.input_method add value if not exists 'voice';
alter type public.input_method add value if not exists 'mixed';

alter table public.progress_notes
  add column if not exists original_input text,
  add column if not exists working_draft text,
  add column if not exists ai_improved_version text,
  add column if not exists final_approved_version text;

comment on column public.progress_notes.original_input is 'Original worker-authored typed and transcribed input, preserved before AI improvement.';
comment on column public.progress_notes.working_draft is 'Latest editable writing-pad content.';
comment on column public.progress_notes.ai_improved_version is 'Most recent AI-improved version selected into the writing pad.';
comment on column public.progress_notes.final_approved_version is 'Final submitted version; null while the note remains a draft.';

select pg_notify('pgrst', 'reload schema');
