'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getInitials, isCustomerOverdue, type OverdueStrategy } from '@/lib/utils'

interface AttentionCustomer {
  id: string
  name: string
  balance: number
  phone?: string
}

export default function NeedsAttention() {
  const [customers, setCustomers] = useState<AttentionCustomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user
        if (!user) { setLoading(false); return }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('overdue_strategy, overdue_threshold_days')
          .eq('id', user.id)
          .single()

        const strategy: OverdueStrategy = profileData?.overdue_strategy || 'oldest_credit'
        const thresholdDays: number = profileData?.overdue_threshold_days || 7

        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, phone, opening_balance')
          .eq('user_id', user.id)

        const ids = (customersData || []).map((c) => c.id)
        if (ids.length === 0) { setLoading(false); return }

        const { data: txData } = await supabase
          .from('transactions')
          .select('customer_id, amount, date, created_at')
          .in('customer_id', ids)

        const balances: Record<string, number> = {}
        const txByCustomer: Record<string, Array<{ amount: number; date?: string; created_at: string }>> = {}
        for (const t of txData || []) {
          balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)
          if (!txByCustomer[t.customer_id]) txByCustomer[t.customer_id] = []
          txByCustomer[t.customer_id].push({ amount: t.amount, date: t.date, created_at: t.created_at })
        }

        const withBalance = (customersData || [])
          .map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            balance: (c.opening_balance || 0) + (balances[c.id] || 0),
            transactions: txByCustomer[c.id] || [],
          }))
          .filter((c) => isCustomerOverdue(c.balance, c.transactions, strategy, thresholdDays))
          .sort((a, b) => b.balance - a.balance)
          .slice(0, 3)
          .map(({ transactions, ...rest }) => rest)

        setCustomers(withBalance)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="home-section-card">
      <div className="home-section-header">
        <h3>Needs Attention</h3>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty" style={{ padding: '20px' }}>
          <i className="fa-solid fa-check-circle" style={{ color: 'var(--green)' }}></i>
          <p>All clear! No overdue customers.</p>
        </div>
      ) : (
        <div className="attention-list">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="attention-item"
            >
              <div className="attention-left">
                <div className="avatar-sm">{getInitials(c.name)}</div>
                <div>
                  <div className="attention-name">{c.name}</div>
                  <div className="attention-meta">{c.phone || 'No phone'}</div>
                </div>
              </div>
              <div className="attention-amount">Rs.{formatCurrency(c.balance)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}