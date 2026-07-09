'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'

interface LogTx {
  id: string
  amount: number
  note?: string
  date?: string
  created_at: string
  updated_at?: string
  customer_id: string
  customer_name: string
}

export default function TransactionLogPage() {
  const [transactions, setTransactions] = useState<LogTx[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadLog = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, note, date, created_at, updated_at, customer_id, customers!inner(name)')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        console.error('Error loading transaction log:', error)
      } else {
        setTransactions(
          (data || []).map((tx) => ({
            id: tx.id,
            amount: tx.amount,
            note: tx.note,
            date: tx.date,
            created_at: tx.created_at,
            updated_at: tx.updated_at,
            customer_id: tx.customer_id,
            customer_name: (tx.customers as unknown as { name: string }).name,
          }))
        )
      }
      setLoading(false)
    }
    loadLog()
  }, [router])

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
          <h2>Transaction Log</h2>
        </div>
      </Link>

      <div className="tx-list">
        {transactions.length === 0 ? (
          <div className="empty">
            <i className="fa-solid fa-receipt"></i>
            <p>No transactions yet.</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const isCredit = tx.amount > 0
            const isEdited = !!tx.updated_at && tx.updated_at !== tx.created_at
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
                    <div className="tx-note">
                      {tx.customer_name}
                      {isEdited && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--meta)', marginLeft: '6px', fontStyle: 'italic' }}>
                          (edited)
                        </span>
                      )}
                    </div>
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
          })
        )}
      </div>
    </>
  )
}
