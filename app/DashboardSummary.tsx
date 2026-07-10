'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

export default function DashboardSummary() {
  const [outstanding, setOutstanding] = useState<number | null>(null)
  const [overdueCount, setOverdueCount] = useState(0)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user
        if (!user) return

        const { data: customers, error: customersError } = await supabase
          .from('customers')
          .select('id, opening_balance')
          .eq('user_id', user.id)

        if (customersError) throw customersError

        const ids = (customers || []).map((c) => c.id)
        const balances: Record<string, number> = {}

        if (ids.length > 0) {
          const { data: txData, error: txError } = await supabase
            .from('transactions')
            .select('customer_id, amount')
            .in('customer_id', ids)

          if (txError) throw txError

          for (const t of txData || []) {
            balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)
          }
        }

        let total = 0
        let count = 0
        for (const c of customers || []) {
          const balance = (c.opening_balance || 0) + (balances[c.id] || 0)
          if (balance > 0) {
            total += balance
            count += 1
          }
        }

        setOutstanding(total)
        setOverdueCount(count)
      } catch (error) {
        console.error('Error fetching dashboard summary:', error)
      }
    }
    fetchSummary()
  }, [])

  if (outstanding === null) {
    return (
      <div className="outstanding-card">
        <div className="hero-skeleton" style={{ height: '64px' }} />
      </div>
    )
  }

  return (
    <div className="outstanding-card">
      <div>
        <div className="outstanding-label">Total Outstanding</div>
        <div className="outstanding-value">₹{formatCurrency(outstanding)}</div>
        <div className="outstanding-sub">
          Owed by {overdueCount} customer{overdueCount === 1 ? '' : 's'}
        </div>
      </div>
      <div className="outstanding-icon">
        <i className="fa-solid fa-hand-holding-dollar"></i>
      </div>
    </div>
  )
}
