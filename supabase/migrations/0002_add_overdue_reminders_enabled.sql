alter table public.profiles
  add column overdue_reminders_enabled boolean not null default true;
