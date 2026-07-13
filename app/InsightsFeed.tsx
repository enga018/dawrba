'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatCurrency, startOfDay, startOfWeek, daysSince, daysUntilOverdue } from '@/lib/utils'

type IconColor = 'red' | 'orange' | 'green' | 'purple' | 'blue'

interface Insight {
  id: string
  icon: string
  iconColor: IconColor
  title: string
  body: string
  sub?: string
  href: string
}

interface CustomerRow {
  id: string
  name: string
  opening_balance: number
  credit_limit: number | null
}

interface TxRow {
  id: string
  customer_id: string
  amount: number
  date?: string
  created_at: string
}

interface Thresholds {
  thresholdDays: number
  resetThresholdPct: number
  slowPayingRatioPct: number
  balanceRiseThreshold: number
  largePaymentThreshold: number
}

export default function InsightsFeed() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) { setLoading(false); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('overdue_threshold_days, overdue_reset_threshold_pct, slow_paying_ratio_pct, balance_rise_threshold, large_payment_threshold')
        .eq('id', user.id)
        .single()

      const thresholds: Thresholds = {
        thresholdDays: profileData?.overdue_threshold_days || 7,
        resetThresholdPct: profileData?.overdue_reset_threshold_pct || 50,
        slowPayingRatioPct: profileData?.slow_paying_ratio_pct || 30,
        balanceRiseThreshold: profileData?.balance_rise_threshold || 5000,
        largePaymentThreshold: profileData?.large_payment_threshold || 5000,
      }

      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, name, opening_balance, credit_limit')
        .eq('user_id', user.id)
      if (custError) throw custError

      const ids = (customers || []).map((c) => c.id)
      if (ids.length === 0) {
        setInsights([])
        setLoading(false)
        return
      }

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('id, customer_id, amount, date, created_at')
        .in('customer_id', ids)
      if (txError) throw txError

      setInsights(buildInsights(customers as CustomerRow[], (txData || []) as TxRow[], thresholds))
      setLoading(false)
    } catch (err) {
      console.error('Error loading insights feed:', err)
      setError('Failed to load insights')
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const onRefresh = () => loadData()
    window.addEventListener('dawrba:refresh', onRefresh)
    return () => window.removeEventListener('dawrba:refresh', onRefresh)
  }, [loadData])

  if (loading) {
    return (
      <div className="home-section-card">
        <div className="home-section-header">
          <h3>Business Insights</h3>
        </div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      </div>
    )
  }

  if (insights.length === 0 && !error) {
    return null
  }

  return (
    <div className="home-section-card">
      <div className="home-section-header">
        <h3>Business Insights</h3>
      </div>

      <div className="insight-list">
        {insights.map((insight) => (
          <Link key={insight.id} href={insight.href} className="insight-item">
            <div className={`insight-icon ${insight.iconColor}`}>
              <i className={`fa-solid ${insight.icon}`}></i>
            </div>
            <div className="insight-text">
              <div className="insight-title">{insight.title}</div>
              <div className="insight-body">{insight.body}</div>
              {insight.sub && <div className="insight-sub">{insight.sub}</div>}
            </div>
            <div className="insight-chevron">
              <i className="fa-solid fa-chevron-right"></i>
            </div>
          </Link>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px', color: '#dc2626', fontSize: '0.85rem', textAlign: 'center' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function buildInsights(
  customers: CustomerRow[],
  txData: TxRow[],
  thresholds: Thresholds
): Insight[] {
  const nameById = new Map(customers.map((c) => [c.id, c.name]))
  const now = new Date()
  const todayStart = startOfDay(now)
  const sevenDaysAgoStart = startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
  const ninetyDaysAgoStart = startOfDay(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000))
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentWeekKey = startOfWeek(now).getTime()

  const balances: Record<string, number> = {}
  const balancesBeforeToday: Record<string, number> = {}
  const balances7DaysAgo: Record<string, number> = {}
  const balancesBeforeMonth: Record<string, number> = {}
  const txByCustomer: Record<string, Array<{ amount: number; date?: string; created_at: string }>> = {}
  const creditGiven90d: Record<string, number> = {}
  const paid90d: Record<string, number> = {}
  const lastPaymentDate: Record<string, string> = {}
  const firstTxDate: Record<string, string> = {}
  const weeklyCollections: Record<number, number> = {}

  let creditsTodayAmount = 0
  let paymentsTodayAmount = 0
  let todayLargePayment: { amount: number; customerId: string; txId: string } | null = null

  const sorted = [...txData].sort((a, b) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime())

  for (const t of sorted) {
    const cid = t.customer_id
    const amount = t.amount || 0
    const txDate = t.date || t.created_at
    balances[cid] = (balances[cid] || 0) + amount
    if (!txByCustomer[cid]) txByCustomer[cid] = []
    txByCustomer[cid].push({ amount: t.amount, date: t.date, created_at: t.created_at })
    if (!firstTxDate[cid]) firstTxDate[cid] = txDate

    const ts = new Date(txDate).getTime()

    if (ts < todayStart.getTime()) {
      balancesBeforeToday[cid] = (balancesBeforeToday[cid] || 0) + amount
    }
    if (ts < sevenDaysAgoStart.getTime()) {
      balances7DaysAgo[cid] = (balances7DaysAgo[cid] || 0) + amount
    }
    if (ts < monthStart.getTime()) {
      balancesBeforeMonth[cid] = (balancesBeforeMonth[cid] || 0) + amount
    }
    if (ts >= ninetyDaysAgoStart.getTime()) {
      if (amount > 0) creditGiven90d[cid] = (creditGiven90d[cid] || 0) + amount
      else paid90d[cid] = (paid90d[cid] || 0) + Math.abs(amount)
    }

    if (amount < 0) {
      lastPaymentDate[cid] = txDate
      const weekKey = startOfWeek(new Date(txDate)).getTime()
      weeklyCollections[weekKey] = (weeklyCollections[weekKey] || 0) + Math.abs(amount)
    }

    if (ts >= todayStart.getTime()) {
      if (amount > 0) {
        creditsTodayAmount += amount
      } else {
        const abs = Math.abs(amount)
        paymentsTodayAmount += abs
        if (abs >= thresholds.largePaymentThreshold && (!todayLargePayment || abs > todayLargePayment.amount)) {
          todayLargePayment = { amount: abs, customerId: cid, txId: t.id }
        }
      }
    }
  }

  for (const c of customers) {
    const ob = c.opening_balance || 0
    balances[c.id] = ob + (balances[c.id] || 0)
    balancesBeforeToday[c.id] = ob + (balancesBeforeToday[c.id] || 0)
    balances7DaysAgo[c.id] = ob + (balances7DaysAgo[c.id] || 0)
    balancesBeforeMonth[c.id] = ob + (balancesBeforeMonth[c.id] || 0)
  }

  const candidates: Array<{ priority: number; insight: Insight }> = []

  // 1. Credit Limit Exceeded
  let creditLimitBreach: { customerId: string; balance: number; limit: number; overage: number } | null = null
  for (const c of customers) {
    if (c.credit_limit == null) continue
    const balance = balances[c.id] || 0
    if (balance > c.credit_limit) {
      const overage = balance - c.credit_limit
      if (!creditLimitBreach || overage > creditLimitBreach.overage) {
        creditLimitBreach = { customerId: c.id, balance, limit: c.credit_limit, overage }
      }
    }
  }
  if (creditLimitBreach) {
    candidates.push({
      priority: 1,
      insight: {
        id: 'credit-limit-exceeded',
        icon: 'fa-ban',
        iconColor: 'red',
        title: 'Credit Limit Exceeded',
        body: `${nameById.get(creditLimitBreach.customerId) || 'A customer'} owes ₹${formatCurrency(creditLimitBreach.balance)}, limit ₹${formatCurrency(creditLimitBreach.limit)}`,
        sub: `Exceeded by ₹${formatCurrency(creditLimitBreach.overage)}`,
        href: `/customers/${creditLimitBreach.customerId}`,
      },
    })
  }

  // 2. Slow Paying Customer
  let slowestPayer: { customerId: string; ratio: number; credit: number; paid: number } | null = null
  for (const c of customers) {
    const credit = creditGiven90d[c.id] || 0
    if (credit <= 0) continue
    const paid = paid90d[c.id] || 0
    const ratio = paid / credit
    if (ratio * 100 < thresholds.slowPayingRatioPct) {
      if (!slowestPayer || ratio < slowestPayer.ratio) {
        slowestPayer = { customerId: c.id, ratio, credit, paid }
      }
    }
  }
  if (slowestPayer) {
    candidates.push({
      priority: 2,
      insight: {
        id: 'slow-paying-customer',
        icon: 'fa-hourglass-half',
        iconColor: 'red',
        title: 'Slow Payment Pattern',
        body: `${nameById.get(slowestPayer.customerId) || 'A customer'}: only ₹${formatCurrency(slowestPayer.paid)} paid against ₹${formatCurrency(slowestPayer.credit)} in 3 months`,
        href: `/customers/${slowestPayer.customerId}?tab=payment`,
      },
    })
  }

  // 3. Due This Week
  const dueThisWeekCount = customers.filter((c) => {
    const balance = balances[c.id] || 0
    if (balance <= 0) return false
    const remaining = daysUntilOverdue(balance, txByCustomer[c.id] || [], thresholds.thresholdDays, thresholds.resetThresholdPct)
    return remaining !== null && remaining >= 0 && remaining <= 3
  }).length
  if (dueThisWeekCount > 0) {
    candidates.push({
      priority: 3,
      insight: {
        id: 'due-this-week',
        icon: 'fa-clock',
        iconColor: 'red',
        title: 'Due Soon',
        body: `${dueThisWeekCount} customer${dueThisWeekCount === 1 ? '' : 's'} will become overdue in 3 days`,
        href: '/customers?filter=due_soon',
      },
    })
  }

  // 4. Balance Rising Fast
  let fastestRiser: { customerId: string; rise: number } | null = null
  for (const c of customers) {
    const rise = (balances[c.id] || 0) - (balances7DaysAgo[c.id] || 0)
    if (rise > thresholds.balanceRiseThreshold) {
      if (!fastestRiser || rise > fastestRiser.rise) {
        fastestRiser = { customerId: c.id, rise }
      }
    }
  }
  if (fastestRiser) {
    candidates.push({
      priority: 4,
      insight: {
        id: 'balance-rising-fast',
        icon: 'fa-chart-line',
        iconColor: 'red',
        title: 'Balance Increasing',
        body: `${nameById.get(fastestRiser.customerId) || 'A customer'}'s balance rose ₹${formatCurrency(fastestRiser.rise)} this week`,
        href: `/customers/${fastestRiser.customerId}`,
      },
    })
  }

  // 5. No Payment for 30+ Days
  let staleCustomer: { customerId: string; days: number } | null = null
  for (const c of customers) {
    const balance = balances[c.id] || 0
    if (balance <= 0) continue
    const anchor = lastPaymentDate[c.id] || firstTxDate[c.id]
    if (!anchor) continue
    const days = daysSince(anchor)
    if (days >= 30) {
      if (!staleCustomer || days > staleCustomer.days) {
        staleCustomer = { customerId: c.id, days }
      }
    }
  }
  if (staleCustomer) {
    candidates.push({
      priority: 5,
      insight: {
        id: 'no-payment-30-days',
        icon: 'fa-calendar-xmark',
        iconColor: 'red',
        title: 'No Recent Payment',
        body: `${nameById.get(staleCustomer.customerId) || 'A customer'} hasn't paid in ${staleCustomer.days} days`,
        href: `/customers/${staleCustomer.customerId}`,
      },
    })
  }

  // 6. Strong Recovery Day
  const netToday = paymentsTodayAmount - creditsTodayAmount
  if (netToday > 0) {
    candidates.push({
      priority: 6,
      insight: {
        id: 'net-recovery',
        icon: 'fa-arrow-trend-up',
        iconColor: 'green',
        title: 'Strong Recovery Day',
        body: `Collected ₹${formatCurrency(paymentsTodayAmount)} · Credit given ₹${formatCurrency(creditsTodayAmount)}`,
        sub: `Net recovery: +₹${formatCurrency(netToday)}`,
        href: '/reports?period=today',
      },
    })
  }

  // 7. Large Payment Received
  if (todayLargePayment) {
    const payment = todayLargePayment as { amount: number; customerId: string; txId: string }
    candidates.push({
      priority: 7,
      insight: {
        id: 'large-payment-received',
        icon: 'fa-sack-dollar',
        iconColor: 'purple',
        title: 'Large Payment Received',
        body: `${nameById.get(payment.customerId) || 'A customer'} paid ₹${formatCurrency(payment.amount)}`,
        href: `/customers/${payment.customerId}?tx=${payment.txId}`,
      },
    })
  }

  // 8. Balance Cleared
  const fullySettledToday = customers.filter((c) => {
    const before = balancesBeforeToday[c.id] ?? (c.opening_balance || 0)
    const current = balances[c.id] || 0
    return before > 0 && current <= 0
  })
  if (fullySettledToday.length > 0) {
    const featured = fullySettledToday[0]
    candidates.push({
      priority: 8,
      insight: {
        id: 'customer-fully-settled',
        icon: 'fa-circle-check',
        iconColor: 'blue',
        title: 'Balance Cleared',
        body: `${featured.name} fully settled their balance`,
        sub: fullySettledToday.length > 1 ? `+${fullySettledToday.length - 1} more customer${fullySettledToday.length - 1 === 1 ? '' : 's'} settled today` : undefined,
        href: `/customers/${featured.id}`,
      },
    })
  }

  // 9. Best Collection Week
  const currentWeekCollection = weeklyCollections[currentWeekKey] || 0
  let bestPastWeek = 0
  for (const [weekKey, amount] of Object.entries(weeklyCollections)) {
    if (Number(weekKey) === currentWeekKey) continue
    if (amount > bestPastWeek) bestPastWeek = amount
  }
  if (bestPastWeek > 0 && currentWeekCollection > bestPastWeek) {
    candidates.push({
      priority: 9,
      insight: {
        id: 'best-collection-week',
        icon: 'fa-trophy',
        iconColor: 'orange',
        title: 'Best Collection Week',
        body: `Collected ₹${formatCurrency(currentWeekCollection)} this week`,
        sub: `Previous best: ₹${formatCurrency(bestPastWeek)}`,
        href: '/reports?period=week',
      },
    })
  }

  // 10. Outstanding Trend Improved
  let outstandingNow = 0
  let outstandingBeforeMonth = 0
  for (const c of customers) {
    const now2 = balances[c.id] || 0
    const before = balancesBeforeMonth[c.id] || 0
    if (now2 > 0) outstandingNow += now2
    if (before > 0) outstandingBeforeMonth += before
  }
  if (outstandingBeforeMonth > 0 && outstandingNow < outstandingBeforeMonth) {
    const drop = outstandingBeforeMonth - outstandingNow
    const pct = Math.round((drop / outstandingBeforeMonth) * 100)
    candidates.push({
      priority: 10,
      insight: {
        id: 'outstanding-trend-improved',
        icon: 'fa-arrow-trend-down',
        iconColor: 'blue',
        title: 'Outstanding Reduced',
        body: `Outstanding dropped from ₹${formatCurrency(outstandingBeforeMonth)} to ₹${formatCurrency(outstandingNow)}`,
        sub: `-${pct}% this month`,
        href: '/reports?period=month',
      },
    })
  }

  candidates.sort((a, b) => a.priority - b.priority)
  return candidates.slice(0, 3).map((c) => c.insight)
}
