create index if not exists idx_customers_user_id on public.customers (user_id);
create index if not exists idx_transactions_customer_id on public.transactions (customer_id);
create index if not exists idx_transaction_logs_customer_id on public.transaction_logs (customer_id);
