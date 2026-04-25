-- SWEAP CALABARZON Member Database — initial schema
-- Run with: supabase db push  (or paste into Supabase SQL editor)

create extension if not exists "pg_trgm";

-- =========================================================
-- Roles + profiles
-- =========================================================
do $$ begin
  create type user_role as enum ('admin', 'viewer');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        user_role not null default 'viewer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'admin' and is_active from public.profiles where id = auth.uid()),
    false
  );
$$;

-- =========================================================
-- Members
-- =========================================================
create table if not exists public.sweap_members (
  employee_number              text primary key,
  submission_timestamp         timestamptz,
  email_address                text,
  full_name                    text not null,
  permanent_address            text,
  current_address              text,
  contact_number               text,
  birthdate                    date,
  sex                          text,
  civil_status                 text,
  religion                     text,
  sector                       text,
  ip_affiliation               text,
  chapter_base                 text,
  division                     text,
  position                     text,
  status_of_employment         text,
  has_physical_inlife_card     boolean,
  inlife_id_number             text,
  no_inlife_card_reason        text,
  claimed_burial_assistance    boolean,
  emergency_contact_name       text,
  emergency_contact_number     text,
  emergency_contact_relationship text,
  consent_signed               boolean default false,
  consent_text                 text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  created_by                   uuid references auth.users(id),
  updated_by                   uuid references auth.users(id)
);

create index if not exists sweap_members_full_name_trgm
  on public.sweap_members using gin (full_name gin_trgm_ops);
create index if not exists sweap_members_chapter_base_idx on public.sweap_members (chapter_base);
create index if not exists sweap_members_division_idx     on public.sweap_members (division);

create table if not exists public.member_dependents (
  id                    uuid primary key default gen_random_uuid(),
  employee_number       text not null references public.sweap_members(employee_number) on delete cascade,
  slot                  smallint not null check (slot between 1 and 4),
  name                  text,
  relationship          text,
  status                text,
  amount_claimed        text,
  check_voucher_number  text,
  claimant_name         text,
  unique (employee_number, slot)
);

create table if not exists public.member_claimants (
  id              uuid primary key default gen_random_uuid(),
  employee_number text not null references public.sweap_members(employee_number) on delete cascade,
  slot            smallint not null check (slot between 1 and 4),
  name            text,
  relationship    text,
  unique (employee_number, slot)
);

-- =========================================================
-- Audit log
-- =========================================================
do $$ begin
  create type audit_action as enum ('insert','update','delete','import','export','login');
exception when duplicate_object then null; end $$;

create table if not exists public.audit_log (
  id           bigserial primary key,
  actor_id     uuid references auth.users(id),
  actor_email  text,
  action       audit_action not null,
  target_table text,
  target_id    text,
  diff         jsonb,
  created_at   timestamptz not null default now()
);

create or replace function public.audit_member_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  select email into v_email from public.profiles where id = auth.uid();
  insert into public.audit_log (actor_id, actor_email, action, target_table, target_id, diff)
  values (
    auth.uid(),
    v_email,
    case TG_OP when 'INSERT' then 'insert' when 'UPDATE' then 'update' else 'delete' end::audit_action,
    TG_TABLE_NAME,
    coalesce(new.employee_number, old.employee_number),
    case TG_OP
      when 'INSERT' then to_jsonb(new)
      when 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
      else to_jsonb(old)
    end
  );
  return coalesce(new, old);
end $$;

drop trigger if exists trg_audit_members on public.sweap_members;
create trigger trg_audit_members
  after insert or update or delete on public.sweap_members
  for each row execute function public.audit_member_change();

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end $$;

drop trigger if exists trg_members_updated on public.sweap_members;
create trigger trg_members_updated
  before update on public.sweap_members
  for each row execute function public.set_updated_at();

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.profiles         enable row level security;
alter table public.sweap_members    enable row level security;
alter table public.member_dependents enable row level security;
alter table public.member_claimants  enable row level security;
alter table public.audit_log        enable row level security;

-- profiles
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- sweap_members & children: any authenticated SELECT, admin-only writes
do $$
declare t text;
begin
  foreach t in array array['sweap_members','member_dependents','member_claimants'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select using (auth.role() = ''authenticated'')', t);
    execute format('drop policy if exists %1$s_admin_write on public.%1$s', t);
    execute format('create policy %1$s_admin_write on public.%1$s for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- audit_log: admins read; inserts via SECURITY DEFINER trigger only
drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log
  for select using (public.is_admin());
