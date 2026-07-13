-- Supabase's performance advisor flags auth.uid() calls in RLS policies as
-- re-evaluated per-row unless wrapped in a subquery, which the planner can
-- then cache once per query. Every table's policy had this issue.
alter policy "profiles_own" on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "customers_own" on public.customers
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "transactions_own" on public.transactions
  using (customer_id in (select customers.id from public.customers where customers.user_id = (select auth.uid())))
  with check (customer_id in (select customers.id from public.customers where customers.user_id = (select auth.uid())));

alter policy "transaction_logs_own_select" on public.transaction_logs
  using (customer_id in (select customers.id from public.customers where customers.user_id = (select auth.uid())));
