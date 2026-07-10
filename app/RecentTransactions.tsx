'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/lib/utils'

const PAGE_SIZE = 20

interface RecentTx {
  id: string
  amount: number
  note?: string
  date?: string
  customer_id: string
  customer_name: string
}

export default function RecentTransactions({
  limit,
  title = 'Recent Transactions',
  showHeader = true,
}: {
  limit?: number
  title?: string
  showHeader?: boolean
}) {
  const [transactions, setTransactions] = useState<RecentTx[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const pageSize = limit ?? PAGE_SIZE

  const loadPage = useCallback(async (offset: number) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return []

    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, note, date, created_at, customer_id, customers!inner(name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error || !data) return []

    return data.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      note: tx.note,
      date: tx.date,
      customer_id: tx.customer_id,
      customer_name: (tx.customers as unknown as { name: string }).name,
    }))
  }, [pageSize])

  useEffect(() => {
    const load = async () => {
      const page = await loadPage(0)
      setTransactions(page)
      // In compact (limited) mode there is no in-place pagination; the
      // header links out to the full /log instead.
      setHasMore(limit ? false : page.length === pageSize)
      setLoading(false)
    }
    load()
  }, [loadPage, limit, pageSize])

  const handleSeeMore = async () => {
    setLoadingMore(true)
    const page = await loadPage(transactions.length)
    setTransactions((prev) => [...prev, ...page])
    setHasMore(page.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  return (
    <div className="dashboard-recent">
      {showHeader && (
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>{title}</h3>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty">
          <p>No transactions yet.</p>
        </div>
      ) : (
        <>
          <div className="tx-list">
            {transactions.map((tx) => {
              const isCredit = tx.amount > 0
              return (
                <Link
                  key={tx.id}
                  href={`/customers/${tx.customer_id}`}
                  className="tx-item"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="tx-left">
                    <div className={`tx-icon ${isCredit ? 'credit' : 'pay'}`}>
                      <i className={`fa-solid ${isCredit ? 'fa-plus' : 'fa-minus'}`}></i>
                    </div>
                    <div>
                      <div className="tx-note">{tx.customer_name}</div>
                      <div className="tx-date">
                        {tx.note || (isCredit ? 'Credit' : 'Payment')} · {formatDate(tx.date)}
                      </div>
                    </div>
                  </div>
                  <div className={`tx-amount ${isCredit ? 'credit' : 'pay'}`}>
                    {isCredit ? '+' : '-'}₹{formatCurrency(Math.abs(tx.amount))}
                  </div>
                </Link>
              )
            })}
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
      )}
    </div>
  )
}
