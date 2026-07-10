'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MonthBucket {
  label: string
  year: number
  month: number
  total: number
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
            total: 0,
          })
        }

        if (ids.length > 0) {
          const { data: txData } = await supabase
            .from('transactions')
            .select('amount, created_at')
            .in('customer_id', ids)

          for (const t of txData || []) {
            // Collections = payments received (negative transactions).
            if (t.amount >= 0) continue
            const d = new Date(t.created_at)
            const b = buckets.find((m) => m.year === d.getFullYear() && m.month === d.getMonth())
            if (b) b.total += Math.abs(t.amount)
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
  const max = Math.max(...months.map((m) => m.total), 1)

  return (
    <div className="hero-card">
      <div className="hero-top">
        <div>
          <div className="hero-label">Collected in {current.label}</div>
          <div className="hero-value">₹{current.total.toLocaleString('en-IN')}</div>
        </div>
        <div className="hero-sub">Last 6 months</div>
      </div>

      <div className="hero-chart">
        {months.map((m, i) => (
          <div key={i} className="hero-bar-wrap">
            <div className="hero-bar-track">
              <div
                className="hero-bar"
                data-active={i === months.length - 1}
                style={{ height: `${Math.round((m.total / max) * 100)}%` }}
                title={`${m.label}: ₹${m.total.toLocaleString('en-IN')}`}
              />
            </div>
            <span className="hero-bar-label">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
