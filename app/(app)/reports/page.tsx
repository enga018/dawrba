'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, isCustomerOverdue, daysUntilOverdue, startOfDay, startOfWeek } from '@/lib/utils'

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
  txCount: number
  avgTransactionSize: number
  newCustomers: number
}

interface ReportData extends PeriodStats {
  prev: PeriodStats
  overdueCustomers: OverdueCustomer[]
  highestCredit: HighestTx | null
  highestCollection: HighestTx | null
  collectionRateAllTime: number
  overduePercent: number
  allTimeHighestCredit: HighestTx | null
  allTimeHighestCollection: HighestTx | null
  highestOutstanding: HighestTx | null
  mostPayments: HighestTx | null
  fullySettledThisMonth: number
  overdueCount: number
  dueTodayCount: number
  overdueAmount: number
}

function getPeriodLabel(period: Period): string {
  if (period === 'today') return 'Today'
  if (period === 'week') return 'This week'
  return 'This month'
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
          .select('weekly_report_day, overdue_threshold_days')
          .eq('id', user.id)
          .single()

        const thresholdDays: number = profileData?.overdue_threshold_days || 7
        const weekStartDay: 0 | 1 = profileData?.weekly_report_day === 'monday' ? 1 : 0

        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, opening_balance, created_at')
          .eq('user_id', user.id)

        const ids = (customers || []).map((c) => c.id)
        if (ids.length === 0) {
          setData({
            creditGiven: 0, collected: 0, outstanding: 0, txCount: 0, avgTransactionSize: 0, newCustomers: 0,
            prev: { creditGiven: 0, collected: 0, outstanding: 0, txCount: 0, avgTransactionSize: 0, newCustomers: 0 },
            overdueCustomers: [],
            highestCredit: null,
            highestCollection: null,
            collectionRateAllTime: 0,
            overduePercent: 0,
            allTimeHighestCredit: null,
            allTimeHighestCollection: null,
            highestOutstanding: null,
            mostPayments: null,
            fullySettledThisMonth: 0,
            overdueCount: 0,
            dueTodayCount: 0,
            overdueAmount: 0,
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
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

        let creditGiven = 0, collected = 0
        let prevCredit = 0, prevCollected = 0
        let txCount = 0, prevTxCount = 0
        let highestCreditTx: { amount: number; customerId: string } | null = null
        let highestCollectionTx: { amount: number; customerId: string } | null = null

        let totalCreditAllTime = 0, totalCollectedAllTime = 0
        let allTimeHighestCreditTx: { amount: number; customerId: string } | null = null
        let allTimeHighestCollectionTx: { amount: number; customerId: string } | null = null
        const collectedByCustomer: Record<string, number> = {}

        const balances: Record<string, number> = {}
        const balancesBeforeMonth: Record<string, number> = {}
        const txByCustomer: Record<string, Array<{ amount: number; date?: string; created_at: string }>> = {}

        for (const t of txData || []) {
          const amount = t.amount || 0
          balances[t.customer_id] = (balances[t.customer_id] || 0) + amount
          if (!txByCustomer[t.customer_id]) txByCustomer[t.customer_id] = []
          txByCustomer[t.customer_id].push({ amount: t.amount, date: t.date, created_at: t.created_at })
          const ts = new Date(t.created_at).getTime()

          if (ts < monthStart) {
            balancesBeforeMonth[t.customer_id] = (balancesBeforeMonth[t.customer_id] || 0) + amount
          }

          if (amount > 0) {
            totalCreditAllTime += amount
            if (!allTimeHighestCreditTx || amount > allTimeHighestCreditTx.amount) {
              allTimeHighestCreditTx = { amount, customerId: t.customer_id }
            }
          } else {
            const abs = Math.abs(amount)
            totalCollectedAllTime += abs
            collectedByCustomer[t.customer_id] = (collectedByCustomer[t.customer_id] || 0) + abs
            if (!allTimeHighestCollectionTx || abs > allTimeHighestCollectionTx.amount) {
              allTimeHighestCollectionTx = { amount: abs, customerId: t.customer_id }
            }
          }

          if (ts >= periodStart) {
            txCount += 1
            if (amount > 0) {
              creditGiven += amount
              if (!highestCreditTx || amount > highestCreditTx.amount) {
                highestCreditTx = { amount, customerId: t.customer_id }
              }
            } else {
              const abs = Math.abs(amount)
              collected += abs
              if (!highestCollectionTx || abs > highestCollectionTx.amount) {
                highestCollectionTx = { amount: abs, customerId: t.customer_id }
              }
            }
          } else if (ts >= prevStart && ts <= prevEnd) {
            prevTxCount += 1
            if (amount > 0) prevCredit += amount
            else prevCollected += Math.abs(amount)
          }
        }

        let newCustomers = 0, prevNewCustomers = 0
        for (const c of customers || []) {
          if (!c.created_at) continue
          const createdTs = new Date(c.created_at).getTime()
          if (createdTs >= periodStart) newCustomers += 1
          else if (createdTs >= prevStart && createdTs <= prevEnd) prevNewCustomers += 1
        }

        let outstanding = 0
        let fullySettledThisMonth = 0
        let dueTodayCount = 0
        let highestOutstandingTx: { amount: number; customerId: string } | null = null
        let mostPaymentsTx: { amount: number; customerId: string } | null = null
        const overdueList: OverdueCustomer[] = []

        for (const c of customers || []) {
          const ob = c.opening_balance || 0
          totalCreditAllTime += ob

          const balance = ob + (balances[c.id] || 0)
          const balanceBeforeMonth = ob + (balancesBeforeMonth[c.id] || 0)

          if (balance > 0) {
            outstanding += balance
            if (isCustomerOverdue(balance, txByCustomer[c.id] || [], thresholdDays)) {
              overdueList.push({ name: c.name, balance })
            } else if (daysUntilOverdue(balance, txByCustomer[c.id] || [], thresholdDays) === 0) {
              dueTodayCount += 1
            }
          }

          if (balanceBeforeMonth > 0 && balance <= 0) fullySettledThisMonth += 1

          if (!highestOutstandingTx || balance > highestOutstandingTx.amount) {
            highestOutstandingTx = { amount: balance, customerId: c.id }
          }

          const totalPaidByCustomer = collectedByCustomer[c.id] || 0
          if (totalPaidByCustomer > 0 && (!mostPaymentsTx || totalPaidByCustomer > mostPaymentsTx.amount)) {
            mostPaymentsTx = { amount: totalPaidByCustomer, customerId: c.id }
          }
        }

        overdueList.sort((a, b) => b.balance - a.balance)

        const collectionRateAllTime = totalCreditAllTime > 0 ? Math.round((totalCollectedAllTime / totalCreditAllTime) * 100) : 0
        const overduePercent = (customers || []).length > 0 ? Math.round((overdueList.length / (customers || []).length) * 100) : 0
        const overdueAmount = overdueList.reduce((sum, c) => sum + c.balance, 0)
        const avgTransactionSize = txCount > 0 ? Math.round((creditGiven + collected) / txCount) : 0
        const prevAvgTransactionSize = prevTxCount > 0 ? Math.round((prevCredit + prevCollected) / prevTxCount) : 0

        setData({
          creditGiven,
          collected,
          outstanding,
          txCount,
          avgTransactionSize,
          newCustomers,
          prev: {
            creditGiven: prevCredit,
            collected: prevCollected,
            outstanding,
            txCount: prevTxCount,
            avgTransactionSize: prevAvgTransactionSize,
            newCustomers: prevNewCustomers,
          },
          overdueCustomers: overdueList.slice(0, 3),
          highestCredit: highestCreditTx
            ? { amount: highestCreditTx.amount, customerName: nameById.get(highestCreditTx.customerId) || 'Unknown' }
            : null,
          highestCollection: highestCollectionTx
            ? { amount: highestCollectionTx.amount, customerName: nameById.get(highestCollectionTx.customerId) || 'Unknown' }
            : null,
          collectionRateAllTime,
          overduePercent,
          allTimeHighestCredit: allTimeHighestCreditTx
            ? { amount: allTimeHighestCreditTx.amount, customerName: nameById.get(allTimeHighestCreditTx.customerId) || 'Unknown' }
            : null,
          allTimeHighestCollection: allTimeHighestCollectionTx
            ? { amount: allTimeHighestCollectionTx.amount, customerName: nameById.get(allTimeHighestCollectionTx.customerId) || 'Unknown' }
            : null,
          highestOutstanding: highestOutstandingTx && highestOutstandingTx.amount > 0
            ? { amount: highestOutstandingTx.amount, customerName: nameById.get(highestOutstandingTx.customerId) || 'Unknown' }
            : null,
          mostPayments: mostPaymentsTx
            ? { amount: mostPaymentsTx.amount, customerName: nameById.get(mostPaymentsTx.customerId) || 'Unknown' }
            : null,
          fullySettledThisMonth,
          overdueCount: overdueList.length,
          dueTodayCount,
          overdueAmount,
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
                  <span className="report-stat-label">Net Collection</span>
                  <span className="report-stat-icon report-stat-icon-blue">
                    <i className="fa-solid fa-scale-balanced"></i>
                  </span>
                </div>
                <div className="report-stat-value">
                  {data.collected - data.creditGiven >= 0 ? '+' : '-'}₹{formatCurrency(Math.abs(data.collected - data.creditGiven))}
                </div>
                <div className="report-stat-sub">
                  {getPeriodLabel(period)}
                  {renderChange(data.collected - data.creditGiven, data.prev.collected - data.prev.creditGiven)}
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-header">
                  <span className="report-stat-label">Transactions</span>
                  <span className="report-stat-icon report-stat-icon-blue">
                    <i className="fa-solid fa-receipt"></i>
                  </span>
                </div>
                <div className="report-stat-value">{data.txCount}</div>
                <div className="report-stat-sub">
                  {getPeriodLabel(period)}
                  {renderChange(data.txCount, data.prev.txCount)}
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-header">
                  <span className="report-stat-label">New Customers</span>
                  <span className="report-stat-icon report-stat-icon-green">
                    <i className="fa-solid fa-user-plus"></i>
                  </span>
                </div>
                <div className="report-stat-value">{data.newCustomers}</div>
                <div className="report-stat-sub">
                  {getPeriodLabel(period)}
                  {renderChange(data.newCustomers, data.prev.newCustomers)}
                </div>
              </div>

              <div className="report-stat-card">
                <div className="report-stat-header">
                  <span className="report-stat-label">Avg Transaction Size</span>
                  <span className="report-stat-icon report-stat-icon-blue">
                    <i className="fa-solid fa-calculator"></i>
                  </span>
                </div>
                <div className="report-stat-value">₹{formatCurrency(data.avgTransactionSize)}</div>
                <div className="report-stat-sub">
                  {getPeriodLabel(period)}
                  {renderChange(data.avgTransactionSize, data.prev.avgTransactionSize)}
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
              {data.overdueCount > 0 && (
                <div className="report-section-sub">
                  {data.overdueCount} customer{data.overdueCount === 1 ? '' : 's'} · ₹{formatCurrency(data.overdueAmount)} overdue
                </div>
              )}
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

            <div className="report-section">
              <h3 className="report-section-title">Key Performance</h3>
              <div className="report-stats-grid">
                <div className="report-stat-card">
                  <div className="report-stat-header">
                    <span className="report-stat-label">Collection Rate</span>
                    <span className="report-stat-icon report-stat-icon-green">
                      <i className="fa-solid fa-percent"></i>
                    </span>
                  </div>
                  <div className="report-stat-value">{data.collectionRateAllTime}%</div>
                  <div className="report-stat-sub">All time</div>
                </div>

                <div className="report-stat-card">
                  <div className="report-stat-header">
                    <span className="report-stat-label">Outstanding</span>
                    <span className="report-stat-icon report-stat-icon-orange">
                      <i className="fa-regular fa-calendar"></i>
                    </span>
                  </div>
                  <div className="report-stat-value">₹{formatCurrency(data.outstanding)}</div>
                  <div className="report-stat-sub">Still pending</div>
                </div>

                <div className="report-stat-card">
                  <div className="report-stat-header">
                    <span className="report-stat-label">Overdue %</span>
                    <span className="report-stat-icon report-stat-icon-orange">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                    </span>
                  </div>
                  <div className="report-stat-value">{data.overduePercent}%</div>
                  <div className="report-stat-sub">of all customers</div>
                </div>

                <div className="report-stat-card">
                  <div className="report-stat-header">
                    <span className="report-stat-label">Largest Credit Ever</span>
                    <span className="report-stat-icon report-stat-icon-blue">
                      <i className="fa-solid fa-trophy"></i>
                    </span>
                  </div>
                  <div className="report-stat-value">₹{formatCurrency(data.allTimeHighestCredit?.amount ?? 0)}</div>
                  <div className="report-stat-sub">
                    {data.allTimeHighestCredit ? data.allTimeHighestCredit.customerName : 'No credit yet'}
                  </div>
                </div>

                <div className="report-stat-card">
                  <div className="report-stat-header">
                    <span className="report-stat-label">Largest Collection Ever</span>
                    <span className="report-stat-icon report-stat-icon-green">
                      <i className="fa-solid fa-trophy"></i>
                    </span>
                  </div>
                  <div className="report-stat-value">₹{formatCurrency(data.allTimeHighestCollection?.amount ?? 0)}</div>
                  <div className="report-stat-sub">
                    {data.allTimeHighestCollection ? data.allTimeHighestCollection.customerName : 'No collections yet'}
                  </div>
                </div>

                <div className="report-stat-card">
                  <div className="report-stat-header">
                    <span className="report-stat-label">Highest Outstanding</span>
                    <span className="report-stat-icon report-stat-icon-orange">
                      <i className="fa-solid fa-trophy"></i>
                    </span>
                  </div>
                  <div className="report-stat-value">₹{formatCurrency(data.highestOutstanding?.amount ?? 0)}</div>
                  <div className="report-stat-sub">
                    {data.highestOutstanding ? data.highestOutstanding.customerName : 'No balances owed'}
                  </div>
                </div>
              </div>
            </div>

            <div className="report-section">
              <h3 className="report-section-title">Customer Insights</h3>
              <div className="report-stats-grid">
                <div className="report-stat-card">
                  <div className="report-stat-header">
                    <span className="report-stat-label">Most Payments</span>
                    <span className="report-stat-icon report-stat-icon-green">
                      <i className="fa-solid fa-star"></i>
                    </span>
                  </div>
                  <div className="report-stat-value">₹{formatCurrency(data.mostPayments?.amount ?? 0)}</div>
                  <div className="report-stat-sub">
                    {data.mostPayments ? data.mostPayments.customerName : 'No payments yet'}
                  </div>
                </div>

                <div className="report-stat-card">
                  <div className="report-stat-header">
                    <span className="report-stat-label">Fully Settled</span>
                    <span className="report-stat-icon report-stat-icon-green">
                      <i className="fa-solid fa-circle-check"></i>
                    </span>
                  </div>
                  <div className="report-stat-value">{data.fullySettledThisMonth}</div>
                  <div className="report-stat-sub">This month</div>
                </div>

                <div className="report-stat-card">
                  <div className="report-stat-header">
                    <span className="report-stat-label">Due Today</span>
                    <span className="report-stat-icon report-stat-icon-orange">
                      <i className="fa-regular fa-clock"></i>
                    </span>
                  </div>
                  <div className="report-stat-value">{data.dueTodayCount}</div>
                  <div className="report-stat-sub">Last day of grace period</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
