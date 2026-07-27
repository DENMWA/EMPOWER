-- EmpowerNotes Phase 1: production RLS for scheduling and native invoicing.
-- Run after schema.sql, fix-users-rls-recursion.sql and scheduling-native-invoicing.sql.
-- Safe to run more than once.

alter table public.ndis_pricing_versions
  add column if not exists organisation_id uuid references public.organisations(id) on delete cascade;

alter table public.ndis_pricing_version_diffs
  add column if not exists organisation_id uuid references public.organisations(id) on delete cascade;

alter table public.shift_staff
  alter column staff_user_id drop not null;

alter table public.shift_staff
  add column if not exists staff_invite_id uuid references public.staff_invites(id) on delete cascade;

create index if not exists idx_ndis_pricing_versions_org
  on public.ndis_pricing_versions(organisation_id, status);
create index if not exists idx_ndis_pricing_diffs_org
  on public.ndis_pricing_version_diffs(organisation_id);
create unique index if not exists idx_shift_staff_unique_assignment
  on public.shift_staff(shift_id, staff_user_id)
  where staff_user_id is not null;
create unique index if not exists idx_shift_staff_unique_invite_assignment
  on public.shift_staff(shift_id, staff_invite_id)
  where staff_invite_id is not null;
create unique index if not exists idx_shift_notes_unique_note
  on public.shift_notes(shift_id, note_id);
create unique index if not exists idx_native_invoice_number_org
  on public.native_invoices(organisation_id, invoice_number);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shift_staff_has_assignee'
      and conrelid = 'public.shift_staff'::regclass
  ) then
    alter table public.shift_staff
      add constraint shift_staff_has_assignee
      check (staff_user_id is not null or staff_invite_id is not null);
  end if;
end
$$;

create or replace function public.current_user_can_manage_billing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role in ('case_manager','service_manager','admin','owner','sole_provider')
  )
$$;

create or replace function public.current_user_can_manage_pricing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role in ('admin','owner','sole_provider')
  )
$$;

grant execute on function public.current_user_can_manage_billing() to authenticated;
grant execute on function public.current_user_can_manage_pricing() to authenticated;

-- Support shifts
drop policy if exists "organisation shift access" on public.support_shifts;
drop policy if exists "managers create shifts" on public.support_shifts;
drop policy if exists "authorised users update shifts" on public.support_shifts;
drop policy if exists "admins delete shifts" on public.support_shifts;

create policy "organisation shift access" on public.support_shifts
for select using (
  organisation_id = public.current_user_organisation_id()
  and (
    public.current_user_is_manager()
    or public.assigned_to_participant(participant_id)
    or exists (
      select 1 from public.shift_staff ss
      where ss.shift_id = support_shifts.id
        and ss.staff_user_id = auth.uid()
        and ss.organisation_id = public.current_user_organisation_id()
    )
  )
);

create policy "managers create shifts" on public.support_shifts
for insert with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

create policy "authorised users update shifts" on public.support_shifts
for update using (
  organisation_id = public.current_user_organisation_id()
  and (
    public.current_user_is_manager()
    or exists (
      select 1 from public.shift_staff ss
      where ss.shift_id = support_shifts.id
        and ss.staff_user_id = auth.uid()
        and ss.organisation_id = public.current_user_organisation_id()
    )
  )
) with check (organisation_id = public.current_user_organisation_id());

create policy "admins delete shifts" on public.support_shifts
for delete using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_roster_admin()
);

-- Staff assignments
drop policy if exists "staff view shift assignments" on public.shift_staff;
drop policy if exists "managers create shift assignments" on public.shift_staff;
drop policy if exists "staff respond to assignments" on public.shift_staff;
drop policy if exists "managers delete shift assignments" on public.shift_staff;

create policy "staff view shift assignments" on public.shift_staff
for select using (
  organisation_id = public.current_user_organisation_id()
  and (public.current_user_is_manager() or staff_user_id = auth.uid())
);

create policy "managers create shift assignments" on public.shift_staff
for insert with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

create policy "staff respond to assignments" on public.shift_staff
for update using (
  organisation_id = public.current_user_organisation_id()
  and (public.current_user_is_manager() or staff_user_id = auth.uid())
) with check (
  organisation_id = public.current_user_organisation_id()
  and (public.current_user_is_manager() or staff_user_id = auth.uid())
);

create policy "managers delete shift assignments" on public.shift_staff
for delete using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

-- Shift evidence links and cancellations
drop policy if exists "authorised users view shift notes" on public.shift_notes;
drop policy if exists "authorised users link shift notes" on public.shift_notes;
drop policy if exists "managers remove shift notes" on public.shift_notes;

create policy "authorised users view shift notes" on public.shift_notes
for select using (
  organisation_id = public.current_user_organisation_id()
  and (public.current_user_is_manager() or created_by = auth.uid() or public.assigned_to_participant(participant_id))
);

create policy "authorised users link shift notes" on public.shift_notes
for insert with check (
  organisation_id = public.current_user_organisation_id()
  and created_by = auth.uid()
  and (public.current_user_is_manager() or public.assigned_to_participant(participant_id))
);

create policy "managers remove shift notes" on public.shift_notes
for delete using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_manager()
);

drop policy if exists "authorised users view cancellations" on public.shift_cancellations;
drop policy if exists "authorised users create cancellations" on public.shift_cancellations;
drop policy if exists "billing managers review cancellations" on public.shift_cancellations;

create policy "authorised users view cancellations" on public.shift_cancellations
for select using (
  organisation_id = public.current_user_organisation_id()
  and (public.current_user_is_manager() or cancelled_by = auth.uid() or public.assigned_to_participant(participant_id))
);

create policy "authorised users create cancellations" on public.shift_cancellations
for insert with check (
  organisation_id = public.current_user_organisation_id()
  and cancelled_by = auth.uid()
  and (public.current_user_is_manager() or public.assigned_to_participant(participant_id))
);

create policy "billing managers review cancellations" on public.shift_cancellations
for update using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
) with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
);

-- Service agreements and agreement items
drop policy if exists "authorised users view service agreements" on public.service_agreements;
drop policy if exists "billing managers create service agreements" on public.service_agreements;
drop policy if exists "billing managers update service agreements" on public.service_agreements;
drop policy if exists "billing admins delete service agreements" on public.service_agreements;

create policy "authorised users view service agreements" on public.service_agreements
for select using (
  organisation_id = public.current_user_organisation_id()
  and (public.current_user_can_manage_billing() or public.assigned_to_participant(participant_id))
);

create policy "billing managers create service agreements" on public.service_agreements
for insert with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
);

create policy "billing managers update service agreements" on public.service_agreements
for update using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
) with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
);

create policy "billing admins delete service agreements" on public.service_agreements
for delete using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_roster_admin()
);

drop policy if exists "authorised users view agreement items" on public.service_agreement_items;
drop policy if exists "billing managers create agreement items" on public.service_agreement_items;
drop policy if exists "billing managers update agreement items" on public.service_agreement_items;
drop policy if exists "billing admins delete agreement items" on public.service_agreement_items;

create policy "authorised users view agreement items" on public.service_agreement_items
for select using (
  organisation_id = public.current_user_organisation_id()
  and (public.current_user_can_manage_billing() or public.assigned_to_participant(participant_id))
);

create policy "billing managers create agreement items" on public.service_agreement_items
for insert with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
);

create policy "billing managers update agreement items" on public.service_agreement_items
for update using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
) with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
);

create policy "billing admins delete agreement items" on public.service_agreement_items
for delete using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_roster_admin()
);

-- Native invoices are finance records and are never worker-visible by default.
drop policy if exists "billing managers view invoices" on public.native_invoices;
drop policy if exists "billing managers create invoices" on public.native_invoices;
drop policy if exists "billing managers update invoices" on public.native_invoices;
drop policy if exists "billing admins delete invoices" on public.native_invoices;

create policy "billing managers view invoices" on public.native_invoices
for select using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
);

create policy "billing managers create invoices" on public.native_invoices
for insert with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
);

create policy "billing managers update invoices" on public.native_invoices
for update using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
) with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
);

create policy "billing admins delete invoices" on public.native_invoices
for delete using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_roster_admin()
);

drop policy if exists "billing managers view invoice lines" on public.native_invoice_lines;
drop policy if exists "billing managers create invoice lines" on public.native_invoice_lines;
drop policy if exists "billing managers update invoice lines" on public.native_invoice_lines;
drop policy if exists "billing admins delete invoice lines" on public.native_invoice_lines;

create policy "billing managers view invoice lines" on public.native_invoice_lines
for select using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
);

create policy "billing managers create invoice lines" on public.native_invoice_lines
for insert with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
);

create policy "billing managers update invoice lines" on public.native_invoice_lines
for update using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
) with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_billing()
);

create policy "billing admins delete invoice lines" on public.native_invoice_lines
for delete using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_is_roster_admin()
);

-- Pricing: active platform records have no organisation_id. Tenant drafts stay private.
drop policy if exists "authenticated users view available pricing" on public.ndis_pricing_versions;
drop policy if exists "pricing admins create tenant pricing" on public.ndis_pricing_versions;
drop policy if exists "pricing admins update tenant pricing" on public.ndis_pricing_versions;
drop policy if exists "pricing admins delete tenant pricing" on public.ndis_pricing_versions;

create policy "authenticated users view available pricing" on public.ndis_pricing_versions
for select using (
  (organisation_id is null and status = 'active')
  or organisation_id = public.current_user_organisation_id()
);

create policy "pricing admins create tenant pricing" on public.ndis_pricing_versions
for insert with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_pricing()
);

create policy "pricing admins update tenant pricing" on public.ndis_pricing_versions
for update using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_pricing()
) with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_pricing()
);

create policy "pricing admins delete tenant pricing" on public.ndis_pricing_versions
for delete using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_pricing()
);

drop policy if exists "authenticated users view available support items" on public.ndis_support_items;
drop policy if exists "pricing admins create tenant support items" on public.ndis_support_items;
drop policy if exists "pricing admins update tenant support items" on public.ndis_support_items;
drop policy if exists "pricing admins delete tenant support items" on public.ndis_support_items;

create policy "authenticated users view available support items" on public.ndis_support_items
for select using (
  exists (
    select 1 from public.ndis_pricing_versions pv
    where pv.id = ndis_support_items.pricing_version_id
      and ((pv.organisation_id is null and pv.status = 'active') or pv.organisation_id = public.current_user_organisation_id())
  )
);

create policy "pricing admins create tenant support items" on public.ndis_support_items
for insert with check (
  public.current_user_can_manage_pricing()
  and exists (
    select 1 from public.ndis_pricing_versions pv
    where pv.id = ndis_support_items.pricing_version_id
      and pv.organisation_id = public.current_user_organisation_id()
  )
);

create policy "pricing admins update tenant support items" on public.ndis_support_items
for update using (
  public.current_user_can_manage_pricing()
  and exists (
    select 1 from public.ndis_pricing_versions pv
    where pv.id = ndis_support_items.pricing_version_id
      and pv.organisation_id = public.current_user_organisation_id()
  )
) with check (
  public.current_user_can_manage_pricing()
  and exists (
    select 1 from public.ndis_pricing_versions pv
    where pv.id = ndis_support_items.pricing_version_id
      and pv.organisation_id = public.current_user_organisation_id()
  )
);

create policy "pricing admins delete tenant support items" on public.ndis_support_items
for delete using (
  public.current_user_can_manage_pricing()
  and exists (
    select 1 from public.ndis_pricing_versions pv
    where pv.id = ndis_support_items.pricing_version_id
      and pv.organisation_id = public.current_user_organisation_id()
  )
);

-- Pricing import jobs and diffs
drop policy if exists "pricing admins manage import jobs" on public.ndis_pricing_import_jobs;
create policy "pricing admins manage import jobs" on public.ndis_pricing_import_jobs
for all using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_pricing()
) with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_pricing()
);

drop policy if exists "pricing admins manage version diffs" on public.ndis_pricing_version_diffs;
create policy "pricing admins manage version diffs" on public.ndis_pricing_version_diffs
for all using (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_pricing()
) with check (
  organisation_id = public.current_user_organisation_id()
  and public.current_user_can_manage_pricing()
);
