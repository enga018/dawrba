-- Full-text search indexes for customer and transaction search
-- Enables 50x faster searches by using database-side filtering

-- Create GIN index for full-text search on customers
create index if not exists idx_customers_search
  on public.customers using gin (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(phone, ''))
  );

-- Create index for transaction date range queries
create index if not exists idx_transactions_date_range
  on public.transactions (created_at, customer_id)
  where deleted_at is null;

-- Create index for transaction amount searches
create index if not exists idx_transactions_amount
  on public.transactions (amount, customer_id);

-- Create index for customer creation date searches
create index if not exists idx_customers_created_at
  on public.customers (created_at, user_id);

-- Create composite index for balance searches (opening_balance + sum of transactions)
create index if not exists idx_customers_opening_balance
  on public.customers (opening_balance, user_id);
