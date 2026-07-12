'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, isCustomerOverdue, startOfDay, startOfWeek, type OverdueStrategy } from '@/lib/utils'

type Period = 'today' | 'week' | 'month'

interface OverdueCustomer {
  name: string
  balance: number
}

interface HighestTx {
  amount: number
  customerName: string
}

interface PeriodStats {
  creditGiven: number
  collected: number
  outstanding: number
  collectionRate: number
}

interface ReportData extends PeriodStats {
  prev: PeriodStats
  overdueCustomers: OverdueCustomer[]
  highestCredit: HighestTx | null
  highestCollection: HighestTx | null
}

function getPeriodLabel(period: Period): string {
  if (period === 'today') return 'Today'
  if (period === 'week') return 'This week'
  return 'This month'
}

function rateLabel(rate: number): string {
  if (rate >= 75) return 'Good'
  if (rate >= 50) return 'Fair'
  return 'Low'
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return 100
  return Math.round(((current - previous) / previous) * 100)
}

function formatChange(pct: number | null): { text: string; className: string } | null {
  if (pct === null) return null
  if (pct === 0) return { text: 'No change', className: 'neutral' }
  if (pct > 0) return { text: `+${pct}%`, className: 'up' }
  return { text: `${pct}%`, className: 'down' }
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('today')
  const [data, setData] = useState<ReportData | null>(null)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user
        if (!user) return

        const { data: profileData } = await supabase
          .from('profiles')
          .select('weekly_report_day, overdue_strategy, overdue_threshold_days')
          .eq('id', user.id)
          .single()

        const strategy: OverdueStrategy = profileData?.overdue_strategy || 'fixed_period'
        const thresholdDays: number = profileData?.overdue_threshold_days || 7
        const weekStartDay: 0 | 1 = profileData?.weekly_report_day === 'monday' ? 1 : 0

        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, opening_balance')
          .eq('user_id', user.id)

        const ids = (customers || []).map((c) => c.id)
        if (ids.length === 0) {
          setData({
            creditGiven: 0, collected: 0, outstanding: 0, collectionRate: 0,
            prev: { creditGiven: 0, collected: 0, outstanding: 0, collectionRate: 0 },
            overdueCustomers: [],
            highestCredit: null,
            highestCollection: null,
          })
          return
        }

        const nameById = new Map((customers || []).map((c) => [c.id, c.name]))

        const { data: txData } = await supabase
          .from('transactions')
          .select('customer_id, amount, date, created_at')
          .in('customer_id', ids)

        const now = new Date()
        const periodStart = (() => {
          if (period === 'today') return startOfDay(now).getTime()
          if (period === 'week') return startOfWeek(now, weekStartDay).getTime()
          return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
        })()
        const prevEnd = periodStart - 1
        const prevStart = (() => {
          if (period === 'today') return startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000)).getTime()
          if (period === 'week') return startOfWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), weekStartDay).getTime()
          const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          return prevMonth.getTime()
        })()

        let creditGiven = 0, collected = 0
        let prevCredit = 0, prevCollected = 0
        let highestCreditTx: { amount: number; customerId: string } | null = null
        let highestCollectionTx: { amount: number; customerId: string } | null = null
        const balances: Record<string, number> = {}
        const txByCustomer: Record<string, Array<{ amount: number; date?: string; created_at: string }>> = {}

        for (const t of txData || []) {
          balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)
          if (!txByCustomer[t.customer_id]) txByCustomer[t.customer_id] = []
          txByCustomer[t.customer_id].push({ amount: t.amount, date: t.date, created_at: t.created_at })
          const ts = new Date(t.created_at).getTime()
          if (ts >= periodStart) {
            if (t.amount > 0) {
              creditGiven += t.amount
              if (!highestCreditTx || t.amount > highestCreditTx.amount) {
                highestCreditTx = { amount: t.amount, customerId: t.customer_id }
              }
            } else {
              const abs = Math.abs(t.amount)
              collected += abs
              if (!highestCollectionTx || abs > highestCollectionTx.amount) {
                highestCollectionTx = { amount: abs, customerId: t.customer_id }
              }
            }
          } else if (ts >= prevStart && ts <= prevEnd) {
            if (t.amount > 0) prevCredit += t.amount
            else prevCollected += Math.abs(t.amount)
          }
        }

        let outstanding = 0
        const overdueList: OverdueCustomer[] = []
        for (const c of customers || []) {
          const balance = (c.opening_balance || 0) + (balances[c.id] || 0)
          if (balance > 0) {
            outstanding += balance
            if (isCustomerOverdue(balance, txByCustomer[c.id] || [], strategy, thresholdDays)) {
              overdueList.push({ name: c.name, balance })
            }
          }
        }

        overdueList.sort((a, b) => b.balance - a.balance)

        const total = collected + outstanding
        const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0
        const prevTotal = prevCollected + outstanding
        const prevRate = prevTotal > 0 ? Math.round((prevCollected / prevTotal) * 100) : 0

        setData({
          creditGiven,
          collected,
          outstanding,
          collectionRate,
          prev: { creditGiven: prevCredit, collected: prevCollected, outstanding, collectionRate: prevRate },
          overdueCustomers: overdueList.slice(0, 3),
          highestCredit: highestCreditTx
            ? { amount: highestCreditTx.amount, customerName: nameById.get(highestCreditTx.customerId) || 'Unknown' }
            : null,
          highestCollection: highestCollectionTx
            ? { amount: highestCollectionTx.amount, customerName: nameById.get(highestCollectionTx.customerId) || 'Unknown' }
            : null,
        })
      } catch {
        // silent
      }
    }
    fetchReport()
  }, [period])

  const renderChange = (current: number, previous: number, invert?: boolean) => {
    const pct = percentChange(current, previous)
    const change = formatChange(pct)
    if (!change) return null
    const cls = invert
      ? change.className === 'up' ? 'down' : change.className === 'down' ? 'up' : 'neutral'
      : change.className
    return <span className={`report-change ${cls}`}>{change.text}</span>
  }

  return (
    <>
      <div className="report-period-tabs">
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            className={`filter-chip ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
          </button>
        ))}
      </div>

      {!data ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : (
        <>
          <div className="report-body">
            <div className="report-stats-grid">
              <div className="report-stat-card">
                <div className="report-stat-header">
                  <span className="report-stat-label">Credit Given</span>
                  <span className="report-stat-icon report-stat-icon-blue">
                    <i className="fa-solid fa-arrow-trend-up"></i>
                  </span>
                </div>
                <div className="report-stat-value">₹{formatCurrency(data.creditGiven)}</div>
                <div className="report-stat-sub">
                  {getPeriodLabel(period)}
                  {renderChange(data.creditGiven, data.prev.creditGiven)}
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-header">
                  <span className="report-stat-label">Collected</span>
                  <span className="report-stat-icon report-stat-icon-green">
                    <i className="fa-solid fa-circle-check"></i>
                  </span>
                </div>
                <div className="report-stat-value">₹{formatCurrency(data.collected)}</div>
                <div className="report-stat-sub">
                  {getPeriodLabel(period)}
                  {renderChange(data.collected, data.prev.collected)}
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-header">
                  <span className="report-stat-label">Collection Rate</span>
                  <span className="report-stat-icon report-stat-icon-blue">
                    <i className="fa-solid fa-chart-column"></i>
                  </span>
                </div>
                <div className="report-stat-value">{data.collectionRate}%</div>
                <div className="report-stat-sub">
                  {rateLabel(data.collectionRate)}
                  {renderChange(data.collectionRate, data.prev.collectionRate)}
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-header">
                  <span className="report-stat-label">Outstanding</span>
                  <span className="report-stat-icon report-stat-icon-orange">
                    <i className="fa-regular fa-calendar"></i>
                  </span>
                </div>
                <div className="report-stat-value">₹{formatCurrency(data.outstanding)}</div>
                <div className="report-stat-sub">
                  Still pending
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-header">
                  <span className="report-stat-label">Highest Credit Given</span>
                  <span className="report-stat-icon report-stat-icon-blue">
                    <i className="fa-solid fa-award"></i>
                  </span>
                </div>
                <div className="report-stat-value">₹{formatCurrency(data.highestCredit?.amount ?? 0)}</div>
                <div className="report-stat-sub">
                  {data.highestCredit ? data.highestCredit.customerName : `No credit ${getPeriodLabel(period).toLowerCase()}`}
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-header">
                  <span className="report-stat-label">Highest Collected</span>
                  <span className="report-stat-icon report-stat-icon-green">
                    <i className="fa-solid fa-award"></i>
                  </span>
                </div>
                <div className="report-stat-value">₹{formatCurrency(data.highestCollection?.amount ?? 0)}</div>
                <div className="report-stat-sub">
                  {data.highestCollection ? data.highestCollection.customerName : `No collections ${getPeriodLabel(period).toLowerCase()}`}
                </div>
              </div>
            </div>

            <div className="report-section">
              <h3 className="report-section-title">Top Overdue Customers</h3>
              {data.overdueCustomers.length === 0 ? (
                <div className="empty" style={{ padding: '20px 0' }}>
                  <i className="fa-solid fa-face-smile"></i>
                  <p>No overdue customers</p>
                </div>
              ) : (
                data.overdueCustomers.map((c) => (
                  <div key={c.name} className="report-overdue-row">
                    <span className="report-overdue-name">{c.name}</span>
                    <span className="report-overdue-amount">₹{formatCurrency(c.balance)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
