alter table public.customers
  add column credit_limit numeric;

alter table public.profiles
  add column slow_paying_ratio_pct integer not null default 30,
  add column balance_rise_threshold numeric not null default 5000,
  add column large_payment_threshold numeric not null default 5000;
