-- Adds service_start_time and service_end_time to native_invoice_lines,
-- so invoices can show the actual time range worked on each line, not
-- just the service date. The underlying shift always has this data
-- (support_shifts.start_time/end_time) but it was never carried through
-- into the invoice line record.
--
-- Safe to run more than once.

alter table public.native_invoice_lines
  add column if not exists service_start_time text,
  add column if not exists service_end_time text;

notify pgrst, 'reload schema';
