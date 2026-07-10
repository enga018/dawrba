'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatLogEntry, type LogEntry } from '@/lib/transactionLog'

export default function RecentTransactions() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('transaction_logs')
        .select('*, customers!inner(name)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (!error) {
        setEntries(
          (data || []).map((entry) => ({
            ...entry,
            customer_name: (entry.customers as unknown as { name: string }).name,
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
          href="/transactions"
          style={{ fontSize: '0.8rem', color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}
        >
          Transaction Log
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty">
          <p>No transactions yet.</p>
        </div>
      ) : (
        <div>
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/customers/${entry.customer_id}`}
              style={{
                display: 'block',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: '0.85rem',
                color: 'var(--text)',
                textDecoration: 'none',
              }}
            >
              {formatLogEntry(entry, true)}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
