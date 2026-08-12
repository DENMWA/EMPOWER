-- House-scoped communication book with read acknowledgement.
-- Apply after house-scoped-access.sql.
create table if not exists public.handover_entries (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete cascade,
  house_id text not null, participant_id uuid references public.participants_or_clients(id) on delete cascade,
  category text not null check (category in ('participant_update','incident_follow_up','appointment','food_fluid','operational','other')),
  priority text not null default 'routine' check (priority in ('routine','important','urgent')),
  summary text not null, follow_up_action text, follow_up_due_at timestamptz, source_type text, source_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (organisation_id, house_id) references public.service_locations(organisation_id, id) on delete restrict
);
create table if not exists public.handover_acknowledgements (
  handover_entry_id uuid not null references public.handover_entries(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, acknowledged_at timestamptz not null default now(),
  primary key (handover_entry_id, user_id)
);
create index if not exists handover_entries_house_time_idx on public.handover_entries (organisation_id, house_id, created_at desc);
alter table public.handover_entries enable row level security;
alter table public.handover_acknowledgements enable row level security;
drop policy if exists "members view accessible house handovers" on public.handover_entries;
create policy "members view accessible house handovers" on public.handover_entries for select to authenticated using (
  organisation_id = public.current_user_organisation_id() and private.current_user_can_access_house(house_id)
  and (participant_id is null or private.current_user_can_access_participant(participant_id)) and private.current_user_has_permission('handover.view'));
drop policy if exists "members create accessible house handovers" on public.handover_entries;
create policy "members create accessible house handovers" on public.handover_entries for insert to authenticated with check (
  organisation_id = public.current_user_organisation_id() and created_by = (select auth.uid()) and private.current_user_can_access_house(house_id)
  and (participant_id is null or private.current_user_can_access_participant(participant_id)) and private.current_user_has_permission('handover.create'));
drop policy if exists "members view own handover acknowledgements" on public.handover_acknowledgements;
create policy "members view own handover acknowledgements" on public.handover_acknowledgements for select to authenticated
using (organisation_id = public.current_user_organisation_id() and user_id = (select auth.uid()));
drop policy if exists "members acknowledge accessible handovers" on public.handover_acknowledgements;
create policy "members acknowledge accessible handovers" on public.handover_acknowledgements for insert to authenticated with check (
  organisation_id = public.current_user_organisation_id() and user_id = (select auth.uid())
  and exists (select 1 from public.handover_entries e where e.id = handover_entry_id and e.organisation_id = handover_acknowledgements.organisation_id));
revoke all on public.handover_entries, public.handover_acknowledgements from anon;
grant select, insert on public.handover_entries, public.handover_acknowledgements to authenticated;
create or replace function private.audit_handover_created() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$ begin
  insert into public.audit_logs (organisation_id, actor_id, action, entity_type, entity_id, metadata) values (new.organisation_id, (select auth.uid()), 'handover_created', 'handover_entry', new.id, jsonb_build_object('house_id', new.house_id, 'participant_id', new.participant_id)); return new; end; $$;
create or replace function private.audit_handover_acknowledged() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$ begin
  insert into public.audit_logs (organisation_id, actor_id, action, entity_type, entity_id, metadata) values (new.organisation_id, (select auth.uid()), 'handover_acknowledged', 'handover_entry', new.handover_entry_id, '{}'::jsonb); return new; end; $$;
revoke all on function private.audit_handover_created(), private.audit_handover_acknowledged() from public, anon, authenticated;
drop trigger if exists audit_handover_entry on public.handover_entries;
create trigger audit_handover_entry after insert on public.handover_entries for each row execute function private.audit_handover_created();
drop trigger if exists audit_handover_acknowledgement on public.handover_acknowledgements;
create trigger audit_handover_acknowledgement after insert on public.handover_acknowledgements for each row execute function private.audit_handover_acknowledged();
select pg_notify('pgrst', 'reload schema');
select to_regclass('public.handover_entries') as handover_entries, to_regclass('public.handover_acknowledgements') as handover_acknowledgements;
