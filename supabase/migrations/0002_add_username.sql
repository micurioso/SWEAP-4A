-- Add username column to profiles for username-based login.
-- Synthetic email format: <username>@sweap.local

alter table public.profiles
  add column if not exists username text unique;

-- Backfill: derive a username from existing emails (everything before @)
update public.profiles
   set username = split_part(email, '@', 1)
 where username is null;

-- Update the new-user trigger to also seed username from metadata if provided
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;
