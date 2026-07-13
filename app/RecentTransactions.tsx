'use client'

import { useCallback, useEffect, useState, memo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getAllCachedTransactions, getCachedCustomers } from '@/lib/offline'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'

const PAGE_SIZE = 20

interface RecentTx {
  id: string
  amount: number
  note?: string
  date?: string
  created_at: string
  customer_id: string
  customer_name: string
}

const RecentActivityItem = memo(function RecentActivityItem({ tx }: { tx: RecentTx }) {
  const isCredit = tx.amount > 0
  return (
    <Link
      href={`/customers/${tx.customer_id}`}
      className="tx-item"
      style={{ textDecoration: 'none' }}
    >
      <div className="tx-left">
        <div className={`tx-icon ${isCredit ? 'credit' : 'pay'}`}>
          <i className={`fa-solid ${isCredit ? 'fa-plus' : 'fa-minus'}`}></i>
        </div>
        <div>
          <div className="tx-header">
            <div className="tx-note">{tx.customer_name}</div>
            <span className={`tx-badge ${isCredit ? 'credit' : 'pay'}`}>
              {isCredit ? 'Credit' : 'Payment'}
            </span>
          </div>
          <div className="tx-date">
            {tx.note ? `${tx.note} · ` : ''}
            {formatDate(tx.date)} · {formatTime(tx.created_at)}
          </div>
        </div>
      </div>
      <div className={`tx-amount ${isCredit ? 'credit' : 'pay'}`}>
        {isCredit ? '+' : '-'}₹{formatCurrency(Math.abs(tx.amount))}
      </div>
    </Link>
  )
})

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

  useEffect(() => {
    const load = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) { setLoading(false); return }

      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, note, date, created_at, customer_id, customers!inner(name)')
        .order('created_at', { ascending: false })
        .limit(pageSize)

      if (!error && data) {
        setTransactions(data.map((tx) => ({
          id: tx.id,
          amount: tx.amount,
          note: tx.note,
          date: tx.date,
          created_at: tx.created_at,
          customer_id: tx.customer_id,
          customer_name: (tx.customers as unknown as { name: string }).name,
        })))
        setHasMore(data.length === pageSize)
      } else {
        const cached = await getAllCachedTransactions<{ id: string; customerId: string; amount: number; note?: string; date?: string; created_at: string }>()
        const customers = await getCachedCustomers<{ id: string; name: string }>()
        const names = new Map(customers.map((c) => [c.id, c.name]))
        setTransactions(cached.slice(0, pageSize).map((tx) => ({
          id: tx.id,
          amount: tx.amount,
          note: tx.note,
          date: tx.date,
          created_at: tx.created_at,
          customer_id: tx.customerId,
          customer_name: names.get(tx.customerId) || 'Unknown',
        })))
        setHasMore(false)
      }
      setLoading(false)
    }
    load()
  }, [pageSize, limit])

  const handleSeeMore = async () => {
    setLoadingMore(true)
    const user = (await supabase.auth.getUser()).data.user
    if (!user) { setLoadingMore(false); return }
    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, note, date, created_at, customer_id, customers!inner(name)')
      .order('created_at', { ascending: false })
      .range(transactions.length, transactions.length + PAGE_SIZE - 1)
    if (!error && data) {
      setTransactions((prev) => [...prev, ...data.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        note: tx.note,
        date: tx.date,
        created_at: tx.created_at,
        customer_id: tx.customer_id,
        customer_name: (tx.customers as unknown as { name: string }).name,
      }))])
      setHasMore(data.length === PAGE_SIZE)
    }
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
            {transactions.map((tx) => (
              <RecentActivityItem key={tx.id} tx={tx} />
            ))}
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
