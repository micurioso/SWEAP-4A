create table if not exists public.employment_status_options (
  value text primary key,
  label text not null unique,
  sort_order smallint not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint employment_status_options_value_not_blank check (btrim(value) <> ''),
  constraint employment_status_options_label_not_blank check (btrim(label) <> '')
);

alter table public.employment_status_options enable row level security;

grant select on table public.employment_status_options to anon, authenticated;

drop policy if exists "Employment statuses are publicly readable"
  on public.employment_status_options;

create policy "Employment statuses are publicly readable"
  on public.employment_status_options
  for select
  to anon, authenticated
  using (is_active);

insert into public.employment_status_options (value, label, sort_order)
values
  ('Casual', 'Casual', 10),
  ('Contract of Service', 'Contract of Service', 20),
  ('Contractual', 'Contractual', 30),
  ('Job Order', 'Job Order', 40),
  ('Permanent', 'Permanent', 50)
on conflict (value) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true;
