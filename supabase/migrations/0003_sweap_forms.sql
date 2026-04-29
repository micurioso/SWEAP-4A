-- SWEAP Forms — admin-uploaded PDFs that all authenticated users can download.

create table if not exists public.sweap_forms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  storage_path  text not null unique,
  uploaded_by   uuid references auth.users(id),
  uploaded_at   timestamptz not null default now()
);

alter table public.sweap_forms enable row level security;

drop policy if exists "sweap_forms read" on public.sweap_forms;
create policy "sweap_forms read" on public.sweap_forms
  for select using (auth.uid() is not null);

drop policy if exists "sweap_forms admin write" on public.sweap_forms;
create policy "sweap_forms admin write" on public.sweap_forms
  for all using (public.is_admin()) with check (public.is_admin());

-- Storage bucket (private; access through signed URLs only).
insert into storage.buckets (id, name, public)
values ('sweap-forms', 'sweap-forms', false)
on conflict (id) do nothing;

drop policy if exists "sweap-forms read" on storage.objects;
create policy "sweap-forms read" on storage.objects
  for select using (bucket_id = 'sweap-forms' and auth.uid() is not null);

drop policy if exists "sweap-forms admin write" on storage.objects;
create policy "sweap-forms admin write" on storage.objects
  for all using (bucket_id = 'sweap-forms' and public.is_admin())
  with check (bucket_id = 'sweap-forms' and public.is_admin());
