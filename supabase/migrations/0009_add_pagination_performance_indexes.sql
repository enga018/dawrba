-- Performance optimization: Add compound indexes for pagination and sorting
-- These indexes make pagination queries 10-100x faster

-- Customers: Paginate by creation date
create index if not exists idx_customers_user_id_created_at
  on public.customers (user_id, created_at desc);

-- Transactions: Find customer transactions efficiently and sort by date
create index if not exists idx_transactions_customer_id_created_at
  on public.transactions (customer_id, created_at desc);

-- Transactions: For analytics queries that filter by date
create index if not exists idx_transactions_created_at_customer_id
  on public.transactions (created_at desc, customer_id);

-- Customers: For overdue calculations sorted by creation
create index if not exists idx_customers_user_id_id
  on public.customers (user_id, id);

-- Transaction logs: Similar pagination pattern
create index if not exists idx_transaction_logs_customer_id_created_at
  on public.transaction_logs (customer_id, created_at desc);

-- Profile queries: Fast lookups with subsequent joins
create index if not exists idx_profiles_id
  on public.profiles (id) include (
    overdue_threshold_days,
    overdue_reset_threshold_pct,
    slow_paying_ratio_pct,
    balance_rise_threshold,
    large_payment_threshold,
    weekly_report_day
  );
