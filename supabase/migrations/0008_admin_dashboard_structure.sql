-- Support for the finalized platform admin dashboard structure:
-- tenant owner name + suspend/activate, and a singleton platform settings row.

alter table public.profiles
  add column owner_name text,
  add column is_suspended boolean not null default false;

create table public.platform_settings (
  id boolean primary key default true,
  app_name text not null default 'DawrBa',
  logo_url text,
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  notifications_enabled boolean not null default true,
  backup_enabled boolean not null default true,
  theme text not null default 'system',
  updated_at timestamptz not null default now(),
  constraint platform_settings_singleton check (id)
);

insert into public.platform_settings (id) values (true);

alter table public.platform_settings enable row level security;
