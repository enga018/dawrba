'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MonthBucket {
  label: string
  year: number
  month: number
  credit: number
  collected: number
}

export default function DashboardHero() {
  const [months, setMonths] = useState<MonthBucket[] | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user
        if (!user) return

        const { data: customers } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)

        const ids = (customers || []).map((c) => c.id)

        // Last 6 months (oldest -> current).
        const now = new Date()
        const buckets: MonthBucket[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          buckets.push({
            label: d.toLocaleString('en-US', { month: 'short' }),
            year: d.getFullYear(),
            month: d.getMonth(),
            credit: 0,
            collected: 0,
          })
        }

        if (ids.length > 0) {
          const { data: txData } = await supabase
            .from('transactions')
            .select('amount, created_at')
            .in('customer_id', ids)

          for (const t of txData || []) {
            const d = new Date(t.created_at)
            const b = buckets.find((m) => m.year === d.getFullYear() && m.month === d.getMonth())
            if (!b) continue
            // Same bucketing rule as the reports page: positive = credit
            // given, negative = payment collected.
            if (t.amount > 0) b.credit += t.amount
            else b.collected += Math.abs(t.amount)
          }
        }

        setMonths(buckets)
      } catch {
        setMonths(null)
      }
    }
    load()
  }, [])

  if (!months) {
    return (
      <div className="hero-card">
        <div className="hero-skeleton" />
      </div>
    )
  }

  const current = months[months.length - 1]
  const max = Math.max(...months.flatMap((m) => [m.credit, m.collected]), 1)
  const fmt = (n: number) => n.toLocaleString('en-IN')

  return (
    <div className="hero-card">
      <div className="hero-top">
        <div>
          <div className="hero-label">This month</div>
          <div className="hero-value">₹{fmt(current.collected)}</div>
          <div className="hero-subvalue">
            <i className="fa-solid fa-plus" style={{ fontSize: '0.7rem' }}></i>{' '}
            ₹{fmt(current.credit)} credit given
          </div>
        </div>
        <div className="hero-legend">
          <span><span className="hero-dot collected"></span>Collected</span>
          <span><span className="hero-dot credit"></span>Credit</span>
        </div>
      </div>

      <div className="hero-chart">
        {months.map((m, i) => (
          <div key={i} className="hero-bar-wrap">
            <div className="hero-bar-track">
              <div className="hero-bar-pair">
                <div
                  className="hero-bar credit"
                  style={{ height: `${Math.round((m.credit / max) * 100)}%` }}
                  title={`${m.label} credit given: ₹${fmt(m.credit)}`}
                />
                <div
                  className="hero-bar collected"
                  style={{ height: `${Math.round((m.collected / max) * 100)}%` }}
                  title={`${m.label} collected: ₹${fmt(m.collected)}`}
                />
              </div>
            </div>
            <span className="hero-bar-label">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
