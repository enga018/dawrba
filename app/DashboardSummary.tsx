'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, isCustomerOverdue, type OverdueStrategy } from '@/lib/utils'

interface SummaryData {
  todayCredit: number
  collectedToday: number
  outstanding: number
  overdueCount: number
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function DashboardSummary() {
  const [data, setData] = useState<SummaryData | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user
        if (!user) return

        const { data: profileData } = await supabase
          .from('profiles')
          .select('overdue_strategy, overdue_threshold_days')
          .eq('id', user.id)
          .single()

        const strategy: OverdueStrategy = profileData?.overdue_strategy || 'fixed_period'
        const thresholdDays: number = profileData?.overdue_threshold_days || 7

        const { data: customers } = await supabase
          .from('customers')
          .select('id, opening_balance')
          .eq('user_id', user.id)

        const ids = (customers || []).map((c) => c.id)
        if (ids.length === 0) {
          setData({ todayCredit: 0, collectedToday: 0, outstanding: 0, overdueCount: 0 })
          return
        }

        const { data: txData } = await supabase
          .from('transactions')
          .select('customer_id, amount, date, created_at')
          .in('customer_id', ids)

        const todayStart = startOfDay(new Date()).getTime()
        let todayCredit = 0
        let collectedToday = 0
        const balances: Record<string, number> = {}
        const txByCustomer: Record<string, Array<{ amount: number; date?: string; created_at: string }>> = {}

        for (const t of txData || []) {
          balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)
          if (!txByCustomer[t.customer_id]) txByCustomer[t.customer_id] = []
          txByCustomer[t.customer_id].push({ amount: t.amount, date: t.date, created_at: t.created_at })
          const ts = new Date(t.created_at).getTime()
          if (ts >= todayStart) {
            if (t.amount > 0) todayCredit += t.amount
            else collectedToday += Math.abs(t.amount)
          }
        }

        let outstanding = 0
        let overdueCount = 0
        for (const c of customers || []) {
          const balance = (c.opening_balance || 0) + (balances[c.id] || 0)
          if (balance > 0) {
            outstanding += balance
            if (isCustomerOverdue(balance, txByCustomer[c.id] || [], strategy, thresholdDays)) {
              overdueCount += 1
            }
          }
        }

        setData({ todayCredit, collectedToday, outstanding, overdueCount })
      } catch {
        // silent
      }
    }
    fetchSummary()
  }, [])

  if (!data) {
    return (
      <div className="summary-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="summary-card">
            <div className="hero-skeleton" style={{ height: '48px' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="summary-grid">
      <div className="summary-card summary-card-green">
        <div className="summary-card-icon">
          <i className="fa-solid fa-plus"></i>
        </div>
        <div className="summary-card-body">
          <span className="summary-card-label">Today Credit</span>
          <span className="summary-card-value green">Rs.{formatCurrency(data.todayCredit)}</span>
        </div>
      </div>

      <div className="summary-card summary-card-blue">
        <div className="summary-card-icon">
          <i className="fa-solid fa-hand-holding-dollar"></i>
        </div>
        <div className="summary-card-body">
          <span className="summary-card-label">Collected Today</span>
          <span className="summary-card-value blue">Rs.{formatCurrency(data.collectedToday)}</span>
        </div>
      </div>

      <div className="summary-card summary-card-orange">
        <div className="summary-card-icon">
          <i className="fa-solid fa-clock-rotate-left"></i>
        </div>
        <div className="summary-card-body">
          <span className="summary-card-label">Outstanding</span>
          <span className="summary-card-value orange">Rs.{formatCurrency(data.outstanding)}</span>
        </div>
      </div>

      <div className="summary-card summary-card-red">
        <div className="summary-card-icon">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div className="summary-card-body">
          <span className="summary-card-label">Overdue</span>
          <span className="summary-card-value red">{overdueCountLabel(data.overdueCount)}</span>
        </div>
      </div>
    </div>
  )
}

function overdueCountLabel(count: number): string {
  if (count === 0) return 'All clear'
  return `${count} customer${count === 1 ? '' : 's'}`
}