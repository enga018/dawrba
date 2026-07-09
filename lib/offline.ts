const CUSTOMERS_KEY = 'dawrba_customers_cache'
const TRANSACTIONS_PREFIX = 'dawrba_tx_cache_'
const SUMMARY_KEY = 'dawrba_summary_cache'
const TIMESTAMP_SUFFIX = '_ts'

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

function setWithExpiry(key: string, data: unknown, ttlMs = 5 * 60 * 1000) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    localStorage.setItem(key + TIMESTAMP_SUFFIX, String(Date.now() + ttlMs))
  } catch {
    // localStorage full or unavailable
  }
}

function getWithExpiry<T>(key: string): T | null {
  try {
    const expiry = localStorage.getItem(key + TIMESTAMP_SUFFIX)
    if (!expiry) return null
    if (Date.now() > Number(expiry)) {
      localStorage.removeItem(key)
      localStorage.removeItem(key + TIMESTAMP_SUFFIX)
      return null
    }
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function cacheCustomers(customers: unknown[]) {
  setWithExpiry(CUSTOMERS_KEY, customers)
}

export function getCachedCustomers<T>(): T[] | null {
  return getWithExpiry<T[]>(CUSTOMERS_KEY)
}

export function cacheTransactions(customerId: string, transactions: unknown[]) {
  setWithExpiry(TRANSACTIONS_PREFIX + customerId, transactions)
}

export function getCachedTransactions<T>(customerId: string): T[] | null {
  return getWithExpiry<T[]>(TRANSACTIONS_PREFIX + customerId)
}

export function cacheSummary(summary: unknown) {
  setWithExpiry(SUMMARY_KEY, summary)
}

export function getCachedSummary<T>(): T | null {
  return getWithExpiry<T>(SUMMARY_KEY)
}

export function clearCustomerCache() {
  try {
    localStorage.removeItem(CUSTOMERS_KEY)
    localStorage.removeItem(CUSTOMERS_KEY + TIMESTAMP_SUFFIX)
  } catch {}
}

export function clearAllCache() {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('dawrba_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
  } catch {}
}

export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (isOnline()) return resolve()
    const handler = () => {
      window.removeEventListener('online', handler)
      resolve()
    }
    window.addEventListener('online', handler)
  })
}

export function useNetworkStatus(onOnline?: () => void) {
  if (typeof window === 'undefined') return
  window.addEventListener('online', () => {
    onOnline?.()
  })
}


