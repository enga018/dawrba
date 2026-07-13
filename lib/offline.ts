import Dexie, { type Table } from 'dexie'
import { showToast } from './toast'

interface CustomerRecord {
  id: string
  name: string
  phone?: string
  balance?: number
  opening_balance?: number
  created_at?: string
  transactions?: Array<{ amount: number; date?: string; created_at: string }>
}

interface TransactionRecord {
  id: string
  customerId: string
  amount: number
  note?: string
  date?: string
  created_at: string
  updated_at?: string
}

interface CachedApiResponse {
  url: string
  data: unknown
  timestamp: number
  ttl: number
}

export interface PendingMutation {
  id?: number
  table: string
  operation: 'insert' | 'update' | 'delete' | 'upsert'
  data: Record<string, unknown>
  filters?: Record<string, unknown>
  createdAt: number
  retries: number
}

class DawrbaDB extends Dexie {
  customers!: Table<CustomerRecord, string>
  transactions!: Table<TransactionRecord, string>
  pendingMutations!: Table<PendingMutation, number>
  apiCache!: Table<CachedApiResponse, string>

  constructor() {
    super('dawrba')
    this.version(1).stores({
      customers: 'id',
      transactions: 'id, customerId',
    })
    this.version(2).stores({
      customers: 'id',
      transactions: 'id, customerId',
      pendingMutations: '++id, createdAt',
    })
    this.version(3).stores({
      customers: 'id',
      transactions: 'id, customerId',
      pendingMutations: '++id, createdAt',
      apiCache: 'url',
    })
  }
}

let db: DawrbaDB | null = null

function getDb(): DawrbaDB {
  if (!db) db = new DawrbaDB()
  return db
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export async function cacheCustomers(customers: CustomerRecord[]) {
  try {
    await getDb().customers.bulkPut(customers)
  } catch {
    // IndexedDB unavailable
  }
}

export async function getCachedCustomers<T>(): Promise<T[]> {
  try {
    const all = await getDb().customers.toArray()
    return all as unknown as T[]
  } catch {
    return []
  }
}

export async function cacheTransactions(customerId: string, transactions: TransactionRecord[]) {
  try {
    const tx = transactions.map((t) => ({ ...t, customerId }))
    await getDb().transactions.where({ customerId }).delete()
    if (tx.length > 0) await getDb().transactions.bulkPut(tx)
  } catch {
    // IndexedDB unavailable
  }
}

export async function getCachedTransactions<T>(customerId: string): Promise<T[]> {
  try {
    const all = await getDb().transactions.where({ customerId }).toArray()
    return all as unknown as T[]
  } catch {
    return []
  }
}

export async function getAllCachedTransactions<T>(): Promise<T[]> {
  try {
    const all = await getDb().transactions.orderBy('created_at').reverse().toArray()
    return all as unknown as T[]
  } catch {
    return []
  }
}

export async function putTransaction(tx: TransactionRecord) {
  try {
    await getDb().transactions.put(tx)
  } catch {
    // IndexedDB unavailable
  }
}

export async function clearAllCache() {
  try {
    await getDb().customers.clear()
    await getDb().transactions.clear()
    await getDb().pendingMutations.clear()
  } catch {}
}

// ─── Mutation Queue ──────────────────────────────────────────

let processing = false

export async function enqueueMutation(mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retries'>) {
  await getDb().pendingMutations.add({
    ...mutation,
    createdAt: Date.now(),
    retries: 0,
  } as PendingMutation)
}

export async function getQueueLength(): Promise<number> {
  return getDb().pendingMutations.count()
}

async function replayMutation(m: PendingMutation) {
  const { supabase } = await import('./supabase')
  const query = supabase.from(m.table)

  switch (m.operation) {
    case 'insert':
    case 'upsert': {
      const { error } = await query[m.operation](m.data as any)
      if (error) throw error
      break
    }
    case 'update': {
      let q = query.update(m.data as any)
      if (m.filters) {
        for (const [key, val] of Object.entries(m.filters)) {
          q = q.eq(key, val)
        }
      }
      const { error } = await q
      if (error) throw error
      break
    }
    case 'delete': {
      let q = query.delete()
      if (m.filters) {
        for (const [key, val] of Object.entries(m.filters)) {
          q = q.eq(key, val)
        }
      }
      const { error } = await q
      if (error) throw error
      break
    }
  }
}

export async function processQueue(): Promise<void> {
  if (processing || !isOnline()) return
  processing = true
  try {
    const mutations = await getDb().pendingMutations.orderBy('createdAt').toArray()
    if (mutations.length === 0) return

    let succeeded = 0
    let failed = 0

    for (const m of mutations) {
      try {
        await replayMutation(m)
        await getDb().pendingMutations.delete(m.id!)
        succeeded++
      } catch (err) {
        console.warn('Conflict — skipping mutation:', m.id, m.operation, m.table, err)
        // Last-write-wins: server state prevails, discard this mutation
        await getDb().pendingMutations.delete(m.id!).catch(() => {})
        failed++
      }
    }

    if (failed === 0) {
      showToast(`All ${succeeded} offline change${succeeded === 1 ? '' : 's'} synced`, 'success')
    } else {
      showToast(`${succeeded} synced, ${failed} skipped due to conflicts`, 'info')
    }
  } finally {
    processing = false
  }
}

// ─── API Response Caching ───────────────────────────────────

export async function cacheApiResponse(
  url: string,
  data: unknown,
  ttlMinutes = 60
) {
  try {
    await getDb().apiCache.put({
      url,
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000,
    })
  } catch {
    // IndexedDB unavailable
  }
}

export async function getCachedApiResponse<T>(url: string): Promise<T | null> {
  try {
    const cached = await getDb().apiCache.get(url)
    if (!cached) return null

    const now = Date.now()
    const age = now - cached.timestamp
    if (age > cached.ttl) {
      await getDb().apiCache.delete(url)
      return null
    }

    return cached.data as T
  } catch {
    return null
  }
}

export async function clearExpiredApiCache() {
  try {
    const all = await getDb().apiCache.toArray()
    const now = Date.now()
    const expired = all.filter(c => now - c.timestamp > c.ttl).map(c => c.url)
    if (expired.length > 0) {
      await getDb().apiCache.bulkDelete(expired)
    }
  } catch {
    // IndexedDB unavailable
  }
}

export function setupAutoSync() {
  if (typeof window === 'undefined') return
  window.addEventListener('online', () => { processQueue() })
  setTimeout(() => { processQueue() }, 1000)
  setInterval(() => { clearExpiredApiCache() }, 5 * 60 * 1000) // Every 5 minutes
}

type WriteResult = { data: any; error: any } | null

export async function offlineWrite(
  executeOnline: () => Promise<WriteResult>,
  mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retries'>,
): Promise<WriteResult> {
  if (isOnline()) {
    const result = await executeOnline()
    if (!result?.error) {
      processQueue()
    }
    return result
  }
  await enqueueMutation(mutation)
  showToast('Saved offline — will sync when connected', 'info')
  return { data: null, error: null }
}
