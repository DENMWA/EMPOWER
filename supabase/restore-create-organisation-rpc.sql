-- Restore the onboarding RPC used after a new owner signs in.
-- Run this file in the Supabase SQL Editor for the project connected to Vercel.

create or replace function public.create_organisation_for_current_user(
  organisation_name text,
  owner_name text,
  owner_email text,
  selected_provider_type public.provider_type default 'organisation'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organisation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create an organisation.';
  end if;

  if exists (select 1 from public.users where id = auth.uid()) then
    select organisation_id
      into new_organisation_id
      from public.users
      where id = auth.uid();
    return new_organisation_id;
  end if;

  insert into public.organisations (name, provider_type, contact_email)
  values (organisation_name, selected_provider_type, owner_email)
  returning id into new_organisation_id;

  insert into public.users (id, organisation_id, name, email, role, provider_type)
  values (
    auth.uid(),
    new_organisation_id,
    owner_name,
    owner_email,
    case
      when selected_provider_type = 'sole_provider'
        then 'sole_provider'::public.user_role
      else 'owner'::public.user_role
    end,
    selected_provider_type
  );

  insert into public.organisation_profiles (
    organisation_id,
    organisation_name,
    email,
    include_in_downloads
  )
  values (new_organisation_id, organisation_name, owner_email, true)
  on conflict (organisation_id) do update set
    organisation_name = excluded.organisation_name,
    email = excluded.email,
    include_in_downloads = true,
    updated_at = now();

  return new_organisation_id;
end;
$$;

revoke all on function public.create_organisation_for_current_user(
  text,
  text,
  text,
  public.provider_type
) from public;

grant execute on function public.create_organisation_for_current_user(
  text,
  text,
  text,
  public.provider_type
) to authenticated;

notify pgrst, 'reload schema';
