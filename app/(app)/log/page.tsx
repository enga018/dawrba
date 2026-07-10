'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatLogEntry, type LogEntry } from '@/lib/transactionLog'

const PAGE_SIZE = 20

export default function TransactionLogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const router = useRouter()

  const loadPage = useCallback(async (offset: number) => {
    const { data, error } = await supabase
      .from('transaction_logs')
      .select('*, customers!inner(name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error || !data) return []

    return data.map((entry) => ({
      ...entry,
      customer_name: (entry.customers as unknown as { name: string }).name,
    }))
  }, [])

  useEffect(() => {
    const load = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        router.push('/login')
        return
      }

      const page = await loadPage(0)
      setEntries(page)
      setHasMore(page.length === PAGE_SIZE)
      setLoading(false)
    }
    load()
  }, [router, loadPage])

  const handleSeeMore = async () => {
    setLoadingMore(true)
    const page = await loadPage(entries.length)
    setEntries((prev) => [...prev, ...page])
    setHasMore(page.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  return (
    <>
      <Link href="/profile">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Activity Log</h2>
        </div>
      </Link>

      <div className="tx-list">
        {entries.length === 0 ? (
          <div className="empty">
            <i className="fa-solid fa-receipt"></i>
            <p>No transactions yet.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/customers/${entry.customer_id}`}
              style={{
                display: 'block',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: '0.88rem',
                color: 'var(--text)',
                textDecoration: 'none',
              }}
            >
              {formatLogEntry(entry, true)}
            </Link>
          ))
        )}
      </div>

      {hasMore && (
        <button
          className="btn btn-secondary btn-sm btn-block"
          style={{ marginTop: '12px' }}
          disabled={loadingMore}
          onClick={handleSeeMore}
        >
          {loadingMore ? <span className="spinner"></span> : 'See more'}
        </button>
      )}
    </>
  )
}
