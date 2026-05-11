-- Adds Employee Status (active/separated/deceased) to sweap_members.
-- Dependent life status reuses the existing member_dependents.status column
-- (already populated from the Google Forms CSV as "Active"/"Deceased").
-- Run this manually in the Supabase SQL editor.

alter table public.sweap_members
  add column if not exists employee_status text not null default 'active';

alter table public.sweap_members
  drop constraint if exists sweap_members_employee_status_chk;

alter table public.sweap_members
  add constraint sweap_members_employee_status_chk
  check (employee_status in ('active','separated','deceased'));

create index if not exists sweap_members_employee_status_idx
  on public.sweap_members (employee_status);

-- Normalize existing dependent status values so case-insensitive equality is unnecessary.
update public.member_dependents
  set status = initcap(trim(status))
  where status is not null and status <> '';
