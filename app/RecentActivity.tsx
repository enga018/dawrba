'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatRelativeTime, formatCurrency } from '@/lib/utils'

interface ActivityEntry {
  id: string
  event_type: 'insert' | 'update' | 'delete' | 'opening_balance' | 'opening_balance_update'
  amount: number | null
  previous_amount: number | null
  created_at: string
  customer_id?: string
  customer_name?: string
}

function getEventLabel(entry: ActivityEntry): string {
  switch (entry.event_type) {
    case 'insert':
      return (entry.amount || 0) > 0 ? 'Credit added' : 'Payment collected'
    case 'update':
      return 'Transaction edited'
    case 'delete':
      return 'Transaction deleted'
    case 'opening_balance':
      return 'Opening balance set'
    case 'opening_balance_update':
      return 'Opening balance edited'
    default:
      return 'Activity'
  }
}

function getEventIcon(entry: ActivityEntry): string {
  switch (entry.event_type) {
    case 'insert':
      return (entry.amount || 0) > 0 ? 'fa-plus' : 'fa-minus'
    case 'update':
      return 'fa-pen'
    case 'delete':
      return 'fa-trash'
    default:
      return 'fa-circle-info'
  }
}

function getEventColor(entry: ActivityEntry): string {
  switch (entry.event_type) {
    case 'insert':
      return (entry.amount || 0) > 0 ? 'tx-icon credit' : 'tx-icon pay'
    case 'update':
      return 'tx-icon'
    case 'delete':
      return 'tx-icon'
    default:
      return 'tx-icon'
  }
}

export default function RecentActivity({ limit = 5 }: { limit?: number }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('transaction_logs')
        .select('id, event_type, amount, previous_amount, created_at, customer_id, customer_name')
        .order('created_at', { ascending: false })
        .limit(limit)

      setEntries(data || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { load() }, [load])

  return (
    <div className="home-section-card">
      <div className="home-section-header">
        <h3>Recent Activity</h3>
        <Link href="/log" className="home-section-link">View all</Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty" style={{ padding: '20px' }}>
          <i className="fa-solid fa-clock-rotate-left"></i>
          <p>No activity yet.</p>
        </div>
      ) : (
        <div className="activity-list">
          {entries.map((entry) => (
            <div key={entry.id} className="activity-item">
              <div className={getEventColor(entry)}>
                <i className={`fa-solid ${getEventIcon(entry)}`}></i>
              </div>
              <div className="activity-body">
                <div className="activity-title">
                  {entry.customer_name && (
                    <Link href={`/customers/${entry.customer_id}`} className="activity-customer">
                      {entry.customer_name}
                    </Link>
                  )}
                  <span className="activity-action">{getEventLabel(entry)}</span>
                </div>
                <div className="activity-meta">
                  {formatRelativeTime(entry.created_at)}
                  {entry.amount != null && (
                    <span className="activity-amount">
                      {' · Rs.'}{formatCurrency(Math.abs(entry.amount))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
