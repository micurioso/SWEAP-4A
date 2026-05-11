-- The new public registration form (replacing the Google Form) collects
-- "Name of HMO" alongside the existing has_physical_inlife_card (boolean)
-- and inlife_id_number (policy / card number). Add a column to store it.
-- Run this manually in the Supabase SQL editor.

alter table public.sweap_members
  add column if not exists hmo_name text;
