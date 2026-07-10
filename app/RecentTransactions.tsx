'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/lib/utils'

interface RecentTx {
  id: string
  amount: number
  note?: string
  date?: string
  customer_id: string
  customer_name: string
}

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<RecentTx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, note, date, created_at, customer_id, customers!inner(name)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (!error) {
        setTransactions(
          (data || []).map((tx) => ({
            id: tx.id,
            amount: tx.amount,
            note: tx.note,
            date: tx.date,
            customer_id: tx.customer_id,
            customer_name: (tx.customers as unknown as { name: string }).name,
          }))
        )
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="dashboard-recent">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Recent Transactions</h3>
        <Link
          href="/log"
          title="Transaction Log"
          style={{ color: 'var(--blue)', fontSize: '1rem', lineHeight: 1 }}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty">
          <p>No transactions yet.</p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
