'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Period = 'daily' | 'weekly' | 'monthly'

interface Tx {
  amount: number
  created_at: string
}

interface Bucket {
  label: string
  start: number
  end: number
  credit: number
  collected: number
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Monday-based start of week.
function startOfWeek(d: Date): Date {
  const s = startOfDay(d)
  const offset = (s.getDay() + 6) % 7
  s.setDate(s.getDate() - offset)
  return s
}

function buildBuckets(period: Period): Bucket[] {
  const now = new Date()
  const buckets: Bucket[] = []

  if (period === 'daily') {
    for (let i = 6; i >= 0; i--) {
      const start = startOfDay(now)
      start.setDate(start.getDate() - i)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      buckets.push({
        label: start.toLocaleString('en-US', { weekday: 'short' }),
        start: start.getTime(),
        end: end.getTime(),
        credit: 0,
        collected: 0,
      })
    }
  } else if (period === 'weekly') {
    const thisWeek = startOfWeek(now)
    for (let i = 5; i >= 0; i--) {
      const start = new Date(thisWeek)
      start.setDate(start.getDate() - i * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      buckets.push({
        label: `${start.getDate()} ${start.toLocaleString('en-US', { month: 'short' })}`,
        start: start.getTime(),
        end: end.getTime(),
        credit: 0,
        collected: 0,
      })
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      buckets.push({
        label: start.toLocaleString('en-US', { month: 'short' }),
        start: start.getTime(),
        end: end.getTime(),
        credit: 0,
        collected: 0,
      })
    }
  }

  return buckets
}

export default function DashboardHero() {
  const [txns, setTxns] = useState<Tx[] | null>(null)
  const [period, setPeriod] = useState<Period>('monthly')

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
        if (ids.length === 0) {
          setTxns([])
          return
        }

        const { data: txData } = await supabase
          .from('transactions')
          .select('amount, created_at')
          .in('customer_id', ids)

        setTxns(txData || [])
      } catch {
        setTxns(null)
      }
    }
    load()
  }, [])

  const buckets = useMemo(() => {
    if (!txns) return null
    const bs = buildBuckets(period)
    for (const t of txns) {
      // Same bucketing rule as the reports page: positive = credit given,
      // negative = payment collected.
      const ts = new Date(t.created_at).getTime()
      const b = bs.find((x) => ts >= x.start && ts < x.end)
      if (!b) continue
      if (t.amount > 0) b.credit += t.amount
      else b.collected += Math.abs(t.amount)
    }
    return bs
  }, [txns, period])

  if (!buckets) {
    return (
      <div className="hero-card">
        <div className="hero-skeleton" />
      </div>
    )
  }

  const current = buckets[buckets.length - 1]
  const max = Math.max(...buckets.flatMap((m) => [m.credit, m.collected]), 1)
  const fmt = (n: number) => n.toLocaleString('en-IN')
  const headline = period === 'daily' ? 'Today' : period === 'weekly' ? 'This week' : 'This month'

  return (
    <div className="hero-card">
      <div className="segmented" style={{ marginBottom: '14px' }}>
        {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`segmented-btn ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>

      <div className="hero-top">
        <div>
          <div className="hero-label">{headline}</div>
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
        {buckets.map((m, i) => (
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
