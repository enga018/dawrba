'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import type { DashboardMetrics } from '@/lib/dashboardCalculations'
import type { DashboardCustomer } from './DashboardPage'

type IconColor = 'red' | 'orange' | 'green' | 'purple' | 'blue'
type InsightPeriod = 'today' | 'week' | 'month' | 'always'

interface Insight {
  id: string
  icon: string
  iconColor: IconColor
  title: string
  body: string
  sub?: string
  href: string
  period: InsightPeriod
}

interface Props {
  metrics: DashboardMetrics
  customers: DashboardCustomer[]
}

const InsightCard = memo(function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Link href={insight.href} className="insight-item">
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
  )
})

export default function InsightsFeed({ metrics, customers }: Props) {
  const [period, setPeriod] = useState<Exclude<InsightPeriod, 'always'>>('today')
  const allInsights = buildInsights(metrics, customers)

  if (allInsights.length === 0) {
    return null
  }

  const insights = allInsights
    .filter((insight) => insight.period === 'always' || insight.period === period)
    .slice(0, 3)

  return (
    <div className="home-section-card">
      <div className="home-section-header">
        <h3>Business Insights</h3>
      </div>

      <div className="tx-tabs" style={{ marginBottom: '12px' }}>
        <button className={`tx-tab ${period === 'today' ? 'active' : ''}`} onClick={() => setPeriod('today')}>
          Today
        </button>
        <button className={`tx-tab ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>
          This Week
        </button>
        <button className={`tx-tab ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>
          This Month
        </button>
      </div>

      {insights.length === 0 ? (
        <div className="empty" style={{ padding: '20px 0' }}>
          <i className="fa-solid fa-lightbulb"></i>
          <p>No insights for this period.</p>
        </div>
      ) : (
        <div className="insight-list">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  )
}

function buildInsights(metrics: DashboardMetrics, customers: DashboardCustomer[]): Insight[] {
  const { nameById, creditLimitBreach, slowestPayer, dueThisWeekCount, fastestRiser, staleCustomer, netToday, paymentsTodayAmount, creditsTodayAmount, todayLargePayment, fullySettledToday, bestCollectionWeek, outstandingBeforeMonth, outstandingNow } = metrics

  const candidates: Array<{ priority: number; insight: Insight }> = []

  // 1. Credit Limit Exceeded
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
        period: 'always',
      },
    })
  }

  // 2. Slow Paying Customer
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
        period: 'always',
      },
    })
  }

  // 3. Due This Week
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
        period: 'week',
      },
    })
  }

  // 4. Balance Rising Fast
  if (fastestRiser) {
    candidates.push({
      priority: 4,
      insight: {
        id: 'balance-rising-fast',
        icon: 'fa-chart-line',
        iconColor: 'red',
        title: 'Balance Increasing',
        body: `${nameById.get(fastestRiser.customerId) || 'A customer'}'s balance rose ₹${formatCurrency(fastestRiser.rise)} ${fastestRiser.isToday ? 'today' : 'this week'}`,
        href: `/customers/${fastestRiser.customerId}`,
        period: fastestRiser.isToday ? 'today' : 'week',
      },
    })
  }

  // 5. No Payment for 30+ Days
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
        period: 'always',
      },
    })
  }

  // 6. Strong Recovery Day
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
        period: 'today',
      },
    })
  }

  // 7. Large Payment Received
  if (todayLargePayment) {
    const payment = todayLargePayment
    candidates.push({
      priority: 7,
      insight: {
        id: 'large-payment-received',
        icon: 'fa-sack-dollar',
        iconColor: 'green',
        title: 'Large Payment Received',
        body: `${nameById.get(payment.customerId) || 'A customer'} paid ₹${formatCurrency(payment.amount)}`,
        href: `/customers/${payment.customerId}?tx=${payment.txId}`,
        period: 'today',
      },
    })
  }

  // 8. Balance Cleared
  if (fullySettledToday.length > 0) {
    const featured = fullySettledToday[0]
    candidates.push({
      priority: 8,
      insight: {
        id: 'customer-fully-settled',
        icon: 'fa-circle-check',
        iconColor: 'green',
        title: 'Balance Cleared',
        body: `${featured.name} fully settled their balance`,
        sub: fullySettledToday.length > 1 ? `+${fullySettledToday.length - 1} more customer${fullySettledToday.length - 1 === 1 ? '' : 's'} settled today` : undefined,
        href: `/customers/${featured.id}`,
        period: 'today',
      },
    })
  }

  // 9. Best Collection Week
  const { currentWeek, bestPastWeek } = bestCollectionWeek
  if (bestPastWeek > 0 && currentWeek > bestPastWeek) {
    candidates.push({
      priority: 9,
      insight: {
        id: 'best-collection-week',
        icon: 'fa-trophy',
        iconColor: 'green',
        title: 'Best Collection Week',
        body: `Collected ₹${formatCurrency(currentWeek)} this week`,
        sub: `Previous best: ₹${formatCurrency(bestPastWeek)}`,
        href: '/reports?period=week',
        period: 'week',
      },
    })
  }

  // 10. Outstanding Trend Improved
  if (outstandingBeforeMonth > 0 && outstandingNow < outstandingBeforeMonth) {
    const drop = outstandingBeforeMonth - outstandingNow
    const pct = Math.round((drop / outstandingBeforeMonth) * 100)
    candidates.push({
      priority: 10,
      insight: {
        id: 'outstanding-trend-improved',
        icon: 'fa-arrow-trend-down',
        iconColor: 'green',
        title: 'Outstanding Reduced',
        body: `Outstanding dropped from ₹${formatCurrency(outstandingBeforeMonth)} to ₹${formatCurrency(outstandingNow)}`,
        sub: `-${pct}% this month`,
        href: '/reports?period=month',
        period: 'month',
      },
    })
  }

  candidates.sort((a, b) => a.priority - b.priority)
  return candidates.map((c) => c.insight)
}
