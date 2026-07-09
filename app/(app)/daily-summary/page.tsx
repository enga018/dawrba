'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface DailyTx {
  id: string
  amount: number
  note?: string
  created_at: string
  customer_name: string
  customer_id: string
}

export default function DailySummaryPage() {
  const [transactions, setTransactions] = useState<DailyTx[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadToday = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        router.push('/login')
        return
      }

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, note, created_at, customer_id, customers!inner(name)')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading daily summary:', error)
      } else {
        setTransactions(
          (data || []).map((tx) => ({
            id: tx.id,
            amount: tx.amount,
            note: tx.note,
            created_at: tx.created_at,
            customer_id: tx.customer_id,
            customer_name: (tx.customers as unknown as { name: string }).name,
          }))
        )
      }
      setLoading(false)
    }
    loadToday()
  }, [router])

  const totalCredit = transactions
    .filter((tx) => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0)

  const totalCollected = transactions
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  return (
    <>
      <Link href="/">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Daily Summary</h2>
        </div>
      </Link>

      <div className="detail-card">
        <div style={{ fontSize: '0.85rem', color: 'var(--meta)', marginBottom: '12px' }}>
          {todayStr}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="summary-chip" style={{ background: 'var(--red-bg)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--meta)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Credit Given</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--red)' }}>₹{formatCurrency(totalCredit)}</div>
          </div>
          <div className="summary-chip" style={{ background: 'var(--green-bg)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--meta)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Collected</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--green)' }}>₹{formatCurrency(totalCollected)}</div>
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>
        Transactions Today ({transactions.length})
      </h3>

      <div className="tx-list">
        {transactions.length === 0 ? (
          <div className="empty">
            <i className="fa-solid fa-calendar-day"></i>
            <p>No transactions today.</p>
          </div>
        ) : (
          transactions.map((tx) => {
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
                    <div className="tx-date">{tx.note || (isCredit ? 'Credit' : 'Payment')}</div>
                  </div>
                </div>
                <div className={`tx-amount ${isCredit ? 'credit' : 'pay'}`}>
                  {isCredit ? '+' : '-'}₹{formatCurrency(Math.abs(tx.amount))}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </>
  )
}
