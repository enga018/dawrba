'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, startOfDay, calculateOverdueDays } from '@/lib/utils'

type IconColor = 'red' | 'orange' | 'green' | 'purple' | 'blue'

interface Insight {
  id: string
  icon: string
  iconColor: IconColor
  title: string
  body: string
  sub?: string
}

interface CustomerRow {
  id: string
  name: string
  opening_balance: number
}

interface TxRow {
  customer_id: string
  amount: number
  date?: string
  created_at: string
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
        .select('overdue_threshold_days, overdue_reset_threshold_pct')
        .eq('id', user.id)
        .single()
      const thresholdDays: number = profileData?.overdue_threshold_days || 7
      const resetThresholdPct: number = profileData?.overdue_reset_threshold_pct || 50

      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, name, opening_balance')
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
        .select('customer_id, amount, date, created_at')
        .in('customer_id', ids)
      if (txError) throw txError

      setInsights(buildInsights(customers as CustomerRow[], (txData || []) as TxRow[], thresholdDays, resetThresholdPct))
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
          <h3>Insights</h3>
        </div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="home-section-card">
      <div className="home-section-header">
        <h3>Insights</h3>
      </div>

      <div className="insight-list">
        {insights.map((insight) => (
          <div key={insight.id} className="insight-item">
            <div className={`insight-icon ${insight.iconColor}`}>
              <i className={`fa-solid ${insight.icon}`}></i>
            </div>
            <div className="insight-text">
              <div className="insight-title">{insight.title}</div>
              <div className="insight-body">{insight.body}</div>
              {insight.sub && <div className="insight-sub">{insight.sub}</div>}
            </div>
          </div>
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
  thresholdDays: number,
  resetThresholdPct: number
): Insight[] {
  const nameById = new Map(customers.map((c) => [c.id, c.name]))
  const now = new Date()
  const todayStart = startOfDay(now)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const balances: Record<string, number> = {}
  const balancesBeforeToday: Record<string, number> = {}
  const txByCustomer: Record<string, Array<{ amount: number; date?: string; created_at: string }>> = {}

  let creditsTodayCount = 0
  let paymentsTodayCount = 0
  let creditsTodayAmount = 0
  let paymentsTodayAmount = 0
  let monthCreditMax: { amount: number; customerId: string; created_at: string } | null = null
  let monthCollectionMax: { amount: number; customerId: string; created_at: string } | null = null
  let todayCollectionMax: { amount: number; customerId: string } | null = null

  for (const t of txData) {
    const cid = t.customer_id
    const amount = t.amount || 0
    balances[cid] = (balances[cid] || 0) + amount
    if (!txByCustomer[cid]) txByCustomer[cid] = []
    txByCustomer[cid].push({ amount: t.amount, date: t.date, created_at: t.created_at })

    const ts = new Date(t.created_at).getTime()

    if (ts < todayStart.getTime()) {
      balancesBeforeToday[cid] = (balancesBeforeToday[cid] || 0) + amount
    }

    if (ts >= todayStart.getTime()) {
      if (amount > 0) {
        creditsTodayCount += 1
        creditsTodayAmount += amount
      } else {
        paymentsTodayCount += 1
        const abs = Math.abs(amount)
        paymentsTodayAmount += abs
        if (!todayCollectionMax || abs > todayCollectionMax.amount) {
          todayCollectionMax = { amount: abs, customerId: cid }
        }
      }
    }

    if (ts >= monthStart.getTime()) {
      if (amount > 0) {
        if (!monthCreditMax || amount > monthCreditMax.amount) {
          monthCreditMax = { amount, customerId: cid, created_at: t.created_at }
        }
      } else {
        const abs = Math.abs(amount)
        if (!monthCollectionMax || abs > monthCollectionMax.amount) {
          monthCollectionMax = { amount: abs, customerId: cid, created_at: t.created_at }
        }
      }
    }
  }

  for (const c of customers) {
    const ob = c.opening_balance || 0
    balances[c.id] = ob + (balances[c.id] || 0)
    balancesBeforeToday[c.id] = ob + (balancesBeforeToday[c.id] || 0)
  }

  const candidates: Array<{ priority: number; insight: Insight }> = []

  // Priority 0: Overdue alert - customers who crossed into overdue for the first time today
  const newlyOverdue = customers.filter((c) => {
    const days = calculateOverdueDays(balances[c.id] || 0, txByCustomer[c.id] || [], thresholdDays, resetThresholdPct)
    return days === 1
  })
  if (newlyOverdue.length > 0) {
    const totalAmount = newlyOverdue.reduce((sum, c) => sum + (balances[c.id] || 0), 0)
    candidates.push({
      priority: 0,
      insight: {
        id: 'overdue-alert',
        icon: 'fa-triangle-exclamation',
        iconColor: 'red',
        title: 'Attention needed',
        body: `${newlyOverdue.length} customer${newlyOverdue.length === 1 ? '' : 's'} became overdue today`,
        sub: `Total overdue amount: ₹${formatCurrency(totalAmount)}`,
      },
    })
  }

  // Priority 1: Monthly record - only if today is the day the record was set
  if (monthCreditMax && new Date(monthCreditMax.created_at) >= todayStart) {
    candidates.push({
      priority: 1,
      insight: {
        id: 'monthly-record-credit',
        icon: 'fa-trophy',
        iconColor: 'orange',
        title: 'New monthly record',
        body: `${nameById.get(monthCreditMax.customerId) || 'A customer'} received a ₹${formatCurrency(monthCreditMax.amount)} credit`,
        sub: 'Highest single credit transaction this month',
      },
    })
  }
  if (monthCollectionMax && new Date(monthCollectionMax.created_at) >= todayStart) {
    candidates.push({
      priority: 1,
      insight: {
        id: 'monthly-record-collection',
        icon: 'fa-trophy',
        iconColor: 'orange',
        title: 'New monthly record',
        body: `${nameById.get(monthCollectionMax.customerId) || 'A customer'} paid ₹${formatCurrency(monthCollectionMax.amount)}`,
        sub: 'Highest single collection this month',
      },
    })
  }

  // Priority 2: Net recovery - collected more than credit given today
  const netToday = paymentsTodayAmount - creditsTodayAmount
  if (netToday > 0) {
    candidates.push({
      priority: 2,
      insight: {
        id: 'net-recovery',
        icon: 'fa-arrow-trend-up',
        iconColor: 'green',
        title: 'Strong recovery day',
        body: `Collected ₹${formatCurrency(paymentsTodayAmount)} · Credit given ₹${formatCurrency(creditsTodayAmount)}`,
        sub: `Net recovery: +₹${formatCurrency(netToday)}`,
      },
    })
  }

  // Priority 3: Top performer - a customer fully settled today, else the day's largest collection
  const fullySettledToday = customers.filter((c) => {
    const before = balancesBeforeToday[c.id] ?? (c.opening_balance || 0)
    const current = balances[c.id] || 0
    return before > 0 && current <= 0
  })
  if (fullySettledToday.length > 0) {
    const featured = fullySettledToday[0]
    candidates.push({
      priority: 3,
      insight: {
        id: 'top-performer-settled',
        icon: 'fa-star',
        iconColor: 'purple',
        title: 'Milestone reached',
        body: `${featured.name} fully settled their balance`,
        sub: fullySettledToday.length > 1 ? `+${fullySettledToday.length - 1} more customer${fullySettledToday.length - 1 === 1 ? '' : 's'} settled today` : undefined,
      },
    })
  } else if (todayCollectionMax) {
    candidates.push({
      priority: 3,
      insight: {
        id: 'top-performer',
        icon: 'fa-star',
        iconColor: 'purple',
        title: 'Top collector today',
        body: `${nameById.get(todayCollectionMax.customerId) || 'A customer'} paid ₹${formatCurrency(todayCollectionMax.amount)}`,
        sub: 'Largest collection of the day',
      },
    })
  }

  candidates.sort((a, b) => a.priority - b.priority)
  const selected = candidates.slice(0, 3).map((c) => c.insight)

  if (selected.length < 3) {
    selected.push({
      id: 'daily-digest',
      icon: 'fa-receipt',
      iconColor: 'blue',
      title: "Today's activity",
      body: `${creditsTodayCount} credit${creditsTodayCount !== 1 ? 's' : ''} added, ${paymentsTodayCount} payment${paymentsTodayCount !== 1 ? 's' : ''} collected`,
    })
  }

  return selected
}
