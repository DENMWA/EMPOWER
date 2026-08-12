-- Durable audit history for participant document metadata changes.
-- Apply after the core schema and membership authority migrations.

create or replace function private.audit_document_change()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  document_row public.documents%rowtype;
  action_name text;
begin
  document_row := case when tg_op = 'DELETE' then old else new end;
  action_name := case
    when tg_op = 'INSERT' then 'document_uploaded'
    when tg_op = 'DELETE' then 'document_deleted'
    when new.manager_verified is distinct from old.manager_verified then
      case when new.manager_verified then 'document_verified' else 'document_verification_removed' end
    when new.visibility is distinct from old.visibility then 'document_visibility_changed'
    else 'document_updated'
  end;

  insert into public.audit_logs (organisation_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    document_row.organisation_id,
    (select auth.uid()),
    action_name,
    'document',
    document_row.id,
    jsonb_build_object(
      'participant_id', document_row.participant_id,
      'document_type', document_row.document_type,
      'visibility', document_row.visibility,
      'previous_status', case when tg_op = 'UPDATE' then old.status else null end,
      'status', document_row.status
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.audit_document_change() from public, anon, authenticated;

drop trigger if exists audit_document_changes on public.documents;
create trigger audit_document_changes
after insert or update or delete on public.documents
for each row execute function private.audit_document_change();

