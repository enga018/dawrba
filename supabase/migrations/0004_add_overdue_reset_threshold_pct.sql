alter table public.profiles
  add column overdue_reset_threshold_pct integer not null default 50;
