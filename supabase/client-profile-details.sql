-- Adds production client profile details used by the admin intake form.
-- Safe to run repeatedly in the Supabase SQL Editor.

alter table public.participants_or_clients
  add column if not exists support_needs text,
  add column if not exists communication_preferences text,
  add column if not exists risk_alerts text[] not null default '{}',
  add column if not exists colour_scheme_id text,
  add column if not exists goals text[] not null default '{}',
  add column if not exists assigned_worker_ids text[] not null default '{}',
  add column if not exists primary_house_id text,
  add column if not exists primary_house_name text,
  add column if not exists service_name text,
  add column if not exists ndis_number text,
  add column if not exists preferred_name text,
  add column if not exists date_of_birth date,
  add column if not exists pronouns text,
  add column if not exists address text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists diagnoses text[] not null default '{}',
  add column if not exists medical_conditions text[] not null default '{}',
  add column if not exists allergies text[] not null default '{}',
  add column if not exists medications text[] not null default '{}',
  add column if not exists behaviour_support_notes text,
  add column if not exists emergency_contacts jsonb not null default '[]'::jsonb,
  add column if not exists key_worker_id text;

notify pgrst, 'reload schema';
