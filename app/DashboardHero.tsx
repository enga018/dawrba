'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { percentTrend, formatCurrency } from '@/lib/utils'

type Period = 'daily' | 'weekly' | 'monthly'

interface Tx {
  amount: number
  created_at: string
  customer_id: string
  customer_name: string
}

interface LargestTx {
  amount: number
  customerId: string
  customerName: string
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

// Start of the week that `now` falls in, given the day the week ends on
// (0 = Sunday ... 6 = Saturday). Weeks are 7 days ending on `endDay`.
function currentWeekStart(now: Date, endDay: number): Date {
  const s = startOfDay(now)
  const daysUntilEnd = (endDay - s.getDay() + 7) % 7
  s.setDate(s.getDate() + daysUntilEnd - 6)
  return s
}

function buildBuckets(period: Period, endDay: number): Bucket[] {
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
    const thisWeek = currentWeekStart(now, endDay)
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

function Trend({ value }: { value?: number }) {
  if (value === undefined) return null
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  const icon = value > 0 ? 'fa-arrow-up' : value < 0 ? 'fa-arrow-down' : 'fa-minus'
  return (
    <span className={`hero-trend ${dir}`}>
      <i className={`fa-solid ${icon}`}></i>
      {Math.abs(value)}%
    </span>
  )
}

export default function DashboardHero() {
  const [txns, setTxns] = useState<Tx[] | null>(null)
  const [endDay, setEndDay] = useState(0) // 0 = Sunday
  const [period, setPeriod] = useState<Period>('monthly')

  useEffect(() => {
    const load = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user
        if (!user) return

        const [{ data: customers }, { data: profile }] = await Promise.all([
          supabase.from('customers').select('id').eq('user_id', user.id),
          supabase.from('profiles').select('weekly_report_day').eq('id', user.id).single(),
        ])

        setEndDay(profile?.weekly_report_day === 'saturday' ? 6 : 0)

        const ids = (customers || []).map((c) => c.id)
        if (ids.length === 0) {
          setTxns([])
          return
        }

        const { data: txData } = await supabase
          .from('transactions')
          .select('amount, created_at, customer_id, customers!inner(name)')
          .in('customer_id', ids)

        setTxns(
          (txData || []).map((t) => ({
            amount: t.amount,
            created_at: t.created_at,
            customer_id: t.customer_id,
            customer_name: (t.customers as unknown as { name: string }).name,
          }))
        )
      } catch {
        setTxns(null)
      }
    }
    load()
  }, [])

  const buckets = useMemo(() => {
    if (!txns) return null
    const bs = buildBuckets(period, endDay)
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
  }, [txns, period, endDay])

  if (!buckets) {
    return (
      <div className="hero-card">
        <div className="hero-skeleton" />
      </div>
    )
  }

  const current = buckets[buckets.length - 1]
  const previous = buckets[buckets.length - 2]
  const max = Math.max(...buckets.flatMap((m) => [m.credit, m.collected]), 1)
  const fmt = (n: number) => n.toLocaleString('en-IN')
  const headline = period === 'daily' ? 'Today' : period === 'weekly' ? 'This week' : 'This month'
  const vsLabel = period === 'daily' ? 'yesterday' : period === 'weekly' ? 'last week' : 'last month'

  // Largest single credit / collection within the current period.
  let largestCredit: LargestTx | null = null
  let largestCollection: LargestTx | null = null
  for (const t of txns ?? []) {
    const ts = new Date(t.created_at).getTime()
    if (ts < current.start || ts >= current.end) continue
    if (t.amount > 0) {
      if (!largestCredit || t.amount > largestCredit.amount) {
        largestCredit = { amount: t.amount, customerId: t.customer_id, customerName: t.customer_name }
      }
    } else {
      const a = Math.abs(t.amount)
      if (!largestCollection || a > largestCollection.amount) {
        largestCollection = { amount: a, customerId: t.customer_id, customerName: t.customer_name }
      }
    }
  }

  return (
    <>
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
          <div className="hero-figure">
            <span className="hero-value">₹{fmt(current.collected)}</span>
            <Trend value={percentTrend(current.collected, previous.collected)} />
          </div>
          <div className="hero-figure">
            <span className="hero-subvalue">
              <i className="fa-solid fa-plus" style={{ fontSize: '0.7rem' }}></i> ₹{fmt(current.credit)} credit
            </span>
            <Trend value={percentTrend(current.credit, previous.credit)} />
          </div>
          <div className="hero-vs">vs {vsLabel}</div>
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

    {(largestCredit || largestCollection) && (
      <div style={{ marginBottom: '18px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '4px 0 8px' }}>
          Largest {headline === 'Today' ? 'today' : headline === 'This week' ? 'this week' : 'this month'}
        </h3>
        <div className="tx-list">
          {largestCredit && (
            <Link
              href={`/customers/${largestCredit.customerId}`}
              className="tx-item"
              style={{ textDecoration: 'none' }}
            >
              <div className="tx-left">
                <div className="tx-icon credit">
                  <i className="fa-solid fa-plus"></i>
                </div>
                <div>
                  <div className="tx-note">{largestCredit.customerName}</div>
                  <div className="tx-date">Largest credit given</div>
                </div>
              </div>
              <div className="tx-amount credit">+₹{formatCurrency(largestCredit.amount)}</div>
            </Link>
          )}
          {largestCollection && (
            <Link
              href={`/customers/${largestCollection.customerId}`}
              className="tx-item"
              style={{ textDecoration: 'none' }}
            >
              <div className="tx-left">
                <div className="tx-icon pay">
                  <i className="fa-solid fa-minus"></i>
                </div>
                <div>
                  <div className="tx-note">{largestCollection.customerName}</div>
                  <div className="tx-date">Largest collection</div>
                </div>
              </div>
              <div className="tx-amount pay">-₹{formatCurrency(largestCollection.amount)}</div>
            </Link>
          )}
        </div>
      </div>
    )}
    </>
  )
}
