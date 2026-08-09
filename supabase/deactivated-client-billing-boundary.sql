-- EmpowerNotes client deactivation billing boundary.
-- Run after access-lifecycle-controls.sql. Safe to run more than once.

alter table public.participants_or_clients
  add column if not exists deactivated_at timestamptz;

create or replace function public.enforce_client_invoice_service_period()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  client_status text;
  client_deactivated_at timestamptz;
  agreement_start date;
  agreement_end date;
  service_started_at timestamptz;
  existing_line public.native_invoice_lines%rowtype;
begin
  select l.* into existing_line from public.native_invoice_lines l where l.id = new.id;
  if found
    and existing_line.organisation_id is not distinct from new.organisation_id
    and existing_line.participant_id is not distinct from new.participant_id
    and existing_line.service_agreement_id is not distinct from new.service_agreement_id
    and existing_line.service_date is not distinct from new.service_date then
    return new;
  end if;

  select p.status, p.deactivated_at
    into client_status, client_deactivated_at
  from public.participants_or_clients p
  where p.id = new.participant_id
    and p.organisation_id = new.organisation_id;

  select a.start_date, a.end_date
    into agreement_start, agreement_end
  from public.service_agreements a
  where a.id = new.service_agreement_id
    and a.organisation_id = new.organisation_id
    and a.participant_id = new.participant_id;

  select s.start_time into service_started_at
  from public.support_shifts s
  where s.id = new.shift_id
    and s.organisation_id = new.organisation_id
    and s.participant_id = new.participant_id;

  if agreement_start is null then
    raise exception 'A valid client service agreement is required before invoicing.' using errcode = '23514';
  end if;
  if new.service_date < agreement_start or (agreement_end is not null and new.service_date > agreement_end) then
    raise exception 'The service date is outside the agreed service period.' using errcode = '23514';
  end if;
  if client_status = 'inactive'
    and (client_deactivated_at is null
      or (service_started_at is not null and service_started_at > client_deactivated_at)
      or (service_started_at is null and new.service_date > client_deactivated_at::date)) then
    raise exception 'Billing is disabled for services after client deactivation.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_client_invoice_service_period_trigger on public.native_invoice_lines;
create trigger enforce_client_invoice_service_period_trigger
before insert or update of organisation_id, participant_id, service_agreement_id, service_date, shift_id on public.native_invoice_lines
for each row execute function public.enforce_client_invoice_service_period();

revoke all on function public.enforce_client_invoice_service_period() from public, anon, authenticated;
select pg_notify('pgrst', 'reload schema');

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'participants_or_clients'
  and column_name = 'deactivated_at';
