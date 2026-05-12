-- Adds the 'encoder' role: a middle tier between viewer and admin.
-- Encoders can read AND write to members / dependents / claimants (like admin),
-- but cannot touch the four /admin/* pages (Data Management, Users, Audit, Forms).
-- Page-level enforcement happens in middleware.ts and per-route requireAdmin
-- guards. This migration adds the role value + a SQL helper used by RLS so
-- encoders can write to the member tables.
--
-- Run this manually in the Supabase SQL editor.

alter type user_role add value if not exists 'encoder';

-- Cast role to text so the function body parses even before the new enum
-- value is fully committed (and so we never have to update this list in
-- enum syntax when adding future roles).
create or replace function public.is_member_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role::text in ('admin', 'encoder') and is_active from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Swap the admin-only write policies on the three member tables for the
-- member_editor policy. Profiles and audit_log keep their is_admin() gates.
do $$
declare t text;
begin
  foreach t in array array['sweap_members','member_dependents','member_claimants'] loop
    execute format('drop policy if exists %1$s_admin_write on public.%1$s', t);
    execute format(
      'create policy %1$s_admin_write on public.%1$s for all using (public.is_member_editor()) with check (public.is_member_editor())',
      t
    );
  end loop;
end $$;
