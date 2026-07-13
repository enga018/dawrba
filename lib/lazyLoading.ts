/**
 * Lazy Loading utilities - fetch data only when needed
 * Reduces initial load time by deferring non-critical data fetches
 */

export interface LazyLoadState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export const initialLazyState = <T>(): LazyLoadState<T> => ({
  data: null,
  loading: false,
  error: null,
})

/**
 * For customer detail pages, defer loading full transaction history
 * until user scrolls or requests it
 */
export async function loadCustomerTransactionsLazy(
  customerId: string,
  supabaseClient: any
): Promise<Array<{ amount: number; date?: string; created_at: string }>> {
  try {
    const { data, error } = await supabaseClient
      .from('transactions')
      .select('id, amount, date, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Failed to load transactions:', err)
    return []
  }
}

/**
 * For reports/analytics, defer loading detailed transaction lists
 * Load summary data first, detailed data on demand
 */
export async function loadSummaryDataFirst(
  supabaseClient: any,
  userId: string
): Promise<{
  customers: any[]
  customerCount: number
  approxTransactionCount: number
}> {
  // Load just customer summaries first (fast)
  const { data: customers } = await supabaseClient
    .from('customers')
    .select('id, name, opening_balance, created_at')
    .eq('user_id', userId)

  // Get count without loading all transactions
  const { count: approxTransactionCount } = await supabaseClient
    .from('transactions')
    .select('*', { count: 'exact', head: true })

  return {
    customers: customers || [],
    customerCount: (customers || []).length,
    approxTransactionCount: approxTransactionCount || 0,
  }
}

/**
 * Batched lazy loading - load data in chunks as needed
 */
export async function loadInBatches<T>(
  loader: (offset: number, limit: number) => Promise<T[]>,
  batchSize: number = 50,
  maxBatches: number = 10
): Promise<T[]> {
  const allResults: T[] = []

  for (let i = 0; i < maxBatches; i++) {
    const batch = await loader(i * batchSize, batchSize)
    if (batch.length === 0) break
    allResults.push(...batch)
  }

  return allResults
}
