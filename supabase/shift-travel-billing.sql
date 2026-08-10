-- EmpowerNotes odometer-backed provider travel billing.
-- Run once in the Supabase SQL editor, then reload the PostgREST schema cache.

alter table public.support_shifts
  add column if not exists odometer_start numeric(12,1),
  add column if not exists odometer_end numeric(12,1),
  add column if not exists travel_kilometres numeric(12,1),
  add column if not exists travel_rate_per_kilometre numeric(12,2),
  add column if not exists travel_support_item_number text,
  add column if not exists travel_notes text;

create or replace function public.calculate_shift_travel_kilometres()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.odometer_start is null or new.odometer_end is null then
    new.travel_kilometres := null;
  elsif new.odometer_end < new.odometer_start then
    raise exception 'Odometer end reading cannot be lower than the start reading';
  else
    new.travel_kilometres := round(new.odometer_end - new.odometer_start, 1);
  end if;
  return new;
end;
$$;

drop trigger if exists support_shifts_calculate_travel on public.support_shifts;
create trigger support_shifts_calculate_travel
before insert or update of odometer_start, odometer_end
on public.support_shifts
for each row execute function public.calculate_shift_travel_kilometres();

alter table public.support_shifts
  drop constraint if exists support_shifts_travel_rate_non_negative;
alter table public.support_shifts
  add constraint support_shifts_travel_rate_non_negative
  check (travel_rate_per_kilometre is null or travel_rate_per_kilometre >= 0);

notify pgrst, 'reload schema';
