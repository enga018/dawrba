'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

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
  totalCreditAllTime: number
  totalCollectedAllTime: number
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

function isPeriod(value: string | null): value is Period {
  return value === 'today' || value === 'week' || value === 'month'
}

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const initialPeriod = searchParams.get('period')
  const [period, setPeriod] = useState<Period>(isPeriod(initialPeriod) ? initialPeriod : 'today')
  const [data, setData] = useState<ReportData | null>(null)

useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/reports/aggregated?period=${period}`)
        if (!response.ok) throw new Error('Failed to fetch report')
        const metrics = await response.json()
        setData(metrics)
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
                    <span className="report-stat-label">Total Credit Given</span>
                    <span className="report-stat-icon report-stat-icon-blue">
                      <i className="fa-solid fa-arrow-trend-up"></i>
                    </span>
                  </div>
                  <div className="report-stat-value">₹{formatCurrency(data.totalCreditAllTime)}</div>
                  <div className="report-stat-sub">All time</div>
                </div>

                <div className="report-stat-card">
                  <div className="report-stat-header">
                    <span className="report-stat-label">Total Collection</span>
                    <span className="report-stat-icon report-stat-icon-green">
                      <i className="fa-solid fa-circle-check"></i>
                    </span>
                  </div>
                  <div className="report-stat-value">₹{formatCurrency(data.totalCollectedAllTime)}</div>
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
