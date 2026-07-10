alter table public.profiles
  add column is_platform_admin boolean not null default false;
