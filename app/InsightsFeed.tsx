'use client'

import { memo } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import type { DashboardMetrics } from '@/lib/dashboardCalculations'
import type { DashboardCustomer } from './DashboardPage'

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
  const insights = buildInsights(metrics, customers)

  return (
    <div className="home-section-card">
      <div className="home-section-header">
        <h3>Business Insights</h3>
      </div>

      {insights.length === 0 ? (
        <div className="empty" style={{ padding: '20px' }}>
          <i className="fa-solid fa-lightbulb"></i>
          <p>No new insights to show</p>
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
  const {
    nameById, creditLimitBreach, slowestPayer, dueThisWeekCount, fastestRiser,
    todayLargeCredit, todayLargePayment, fullySettledToday,
    bestCreditAllTime, bestCreditThisMonth, bestCreditThisWeek, bestPastMonthCredit, bestPastWeekCredit,
    bestPaymentAllTime, bestPaymentThisMonth, bestPaymentThisWeek, bestPastMonthPayment, bestPastWeekPayment,
    outstandingBeforeMonth, outstandingNow, outstandingChange, collectionRate90d,
    newCustomersThisWeek, topConcentration, collectionRate,
  } = metrics

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
      },
    })
  }

  // 2. Outstanding Growing
  if (outstandingChange) {
    candidates.push({
      priority: 2,
      insight: {
        id: 'outstanding-growing',
        icon: 'fa-arrow-trend-up',
        iconColor: 'red',
        title: 'Outstanding Growing',
        body: `Outstanding rose from ₹${formatCurrency(outstandingBeforeMonth)} to ₹${formatCurrency(outstandingNow)}`,
        sub: `+${outstandingChange.pct}% this month`,
        href: '/reports?period=month',
      },
    })
  }

  // 3. Collection Rate Dropped
  if (collectionRate > 0 && collectionRate90d > 0 && collectionRate90d < collectionRate - 10) {
    candidates.push({
      priority: 3,
      insight: {
        id: 'collection-rate-dropped',
        icon: 'fa-chart-simple',
        iconColor: 'red',
        title: 'Collection Rate Dropped',
        body: `Only ${collectionRate90d}% collected in last 90 days`,
        sub: `Was ${collectionRate}% overall`,
        href: '/reports?period=month',
      },
    })
  }

  // 4. Slow Paying Customer
  if (slowestPayer) {
    candidates.push({
      priority: 4,
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

  // 5. Due This Week
  if (dueThisWeekCount > 0) {
    candidates.push({
      priority: 5,
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

  // 6. Balance Rising Fast
  if (fastestRiser) {
    candidates.push({
      priority: 6,
      insight: {
        id: 'balance-rising-fast',
        icon: 'fa-chart-line',
        iconColor: 'red',
        title: 'Balance Increasing',
        body: `${nameById.get(fastestRiser.customerId) || 'A customer'}'s balance rose ₹${formatCurrency(fastestRiser.rise)} ${fastestRiser.isToday ? 'today' : 'this week'}`,
        href: `/customers/${fastestRiser.customerId}`,
      },
    })
  }

  // 7. Credit Given / Large Credit Given (hierarchical: all-time → month → week → notable)
  const isAllTimeBestCredit = bestCreditThisMonth && bestCreditAllTime && bestCreditThisMonth.txId === bestCreditAllTime.txId && bestCreditAllTime.amount > 0
  const isMonthBestCredit = bestCreditThisMonth && bestPastMonthCredit > 0 && bestCreditThisMonth.amount > bestPastMonthCredit
  const isWeekBestCredit = bestCreditThisWeek && bestPastWeekCredit > 0 && bestCreditThisWeek.amount > bestPastWeekCredit

  if (isAllTimeBestCredit) {
    candidates.push({
      priority: 7,
      insight: {
        id: 'all-time-highest-credit',
        icon: 'fa-trophy',
        iconColor: 'green',
        title: 'All Time Highest Credit',
        body: `${nameById.get(bestCreditThisMonth.customerId) || 'A customer'} received ₹${formatCurrency(bestCreditThisMonth.amount)}`,
        href: `/customers/${bestCreditThisMonth.customerId}?tx=${bestCreditThisMonth.txId}`,
      },
    })
  } else if (isMonthBestCredit) {
    candidates.push({
      priority: 7,
      insight: {
        id: 'highest-credit-month',
        icon: 'fa-chart-line',
        iconColor: 'green',
        title: 'Highest Credit This Month',
        body: `${nameById.get(bestCreditThisMonth.customerId) || 'A customer'} received ₹${formatCurrency(bestCreditThisMonth.amount)}`,
        sub: `Previous best this month: ₹${formatCurrency(bestPastMonthCredit)}`,
        href: `/customers/${bestCreditThisMonth.customerId}?tx=${bestCreditThisMonth.txId}`,
      },
    })
  } else if (isWeekBestCredit) {
    candidates.push({
      priority: 7,
      insight: {
        id: 'highest-credit-week',
        icon: 'fa-chart-line',
        iconColor: 'green',
        title: 'Highest Credit This Week',
        body: `${nameById.get(bestCreditThisWeek.customerId) || 'A customer'} received ₹${formatCurrency(bestCreditThisWeek.amount)}`,
        sub: `Previous best this week: ₹${formatCurrency(bestPastWeekCredit)}`,
        href: `/customers/${bestCreditThisWeek.customerId}?tx=${bestCreditThisWeek.txId}`,
      },
    })
  } else if (todayLargeCredit) {
    candidates.push({
      priority: 7,
      insight: {
        id: 'large-credit-given',
        icon: 'fa-hand-holding-dollar',
        iconColor: 'green',
        title: 'Large Credit Given',
        body: `${nameById.get(todayLargeCredit.customerId) || 'A customer'} received ₹${formatCurrency(todayLargeCredit.amount)} today`,
        href: `/customers/${todayLargeCredit.customerId}?tx=${todayLargeCredit.txId}`,
      },
    })
  }

  // 8. Best Collection / Large Payment Received (hierarchical: all-time → month → week → notable)
  const isAllTimeBestPayment = bestPaymentThisMonth && bestPaymentAllTime && bestPaymentThisMonth.txId === bestPaymentAllTime.txId && bestPaymentAllTime.amount > 0
  const isMonthBestPayment = bestPaymentThisMonth && bestPastMonthPayment > 0 && bestPaymentThisMonth.amount > bestPastMonthPayment
  const isWeekBestPayment = bestPaymentThisWeek && bestPastWeekPayment > 0 && bestPaymentThisWeek.amount > bestPastWeekPayment

  if (isAllTimeBestPayment) {
    candidates.push({
      priority: 8,
      insight: {
        id: 'all-time-largest-collection',
        icon: 'fa-trophy',
        iconColor: 'green',
        title: 'All Time Largest Collection',
        body: `${nameById.get(bestPaymentThisMonth.customerId) || 'A customer'} paid ₹${formatCurrency(bestPaymentThisMonth.amount)}`,
        href: `/customers/${bestPaymentThisMonth.customerId}?tx=${bestPaymentThisMonth.txId}`,
      },
    })
  } else if (isMonthBestPayment) {
    candidates.push({
      priority: 8,
      insight: {
        id: 'largest-collection-month',
        icon: 'fa-sack-dollar',
        iconColor: 'green',
        title: 'Largest Collection This Month',
        body: `${nameById.get(bestPaymentThisMonth.customerId) || 'A customer'} paid ₹${formatCurrency(bestPaymentThisMonth.amount)}`,
        sub: `Previous best this month: ₹${formatCurrency(bestPastMonthPayment)}`,
        href: `/customers/${bestPaymentThisMonth.customerId}?tx=${bestPaymentThisMonth.txId}`,
      },
    })
  } else if (isWeekBestPayment) {
    candidates.push({
      priority: 8,
      insight: {
        id: 'largest-collection-week',
        icon: 'fa-sack-dollar',
        iconColor: 'green',
        title: 'Largest Collection This Week',
        body: `${nameById.get(bestPaymentThisWeek.customerId) || 'A customer'} paid ₹${formatCurrency(bestPaymentThisWeek.amount)}`,
        sub: `Previous best this week: ₹${formatCurrency(bestPastWeekPayment)}`,
        href: `/customers/${bestPaymentThisWeek.customerId}?tx=${bestPaymentThisWeek.txId}`,
      },
    })
  } else if (todayLargePayment) {
    candidates.push({
      priority: 8,
      insight: {
        id: 'large-payment-received',
        icon: 'fa-sack-dollar',
        iconColor: 'green',
        title: 'Large Payment Received',
        body: `${nameById.get(todayLargePayment.customerId) || 'A customer'} paid ₹${formatCurrency(todayLargePayment.amount)} today`,
        href: `/customers/${todayLargePayment.customerId}?tx=${todayLargePayment.txId}`,
      },
    })
  }

  // 9. New Customers This Week
  if (newCustomersThisWeek > 0) {
    candidates.push({
      priority: 9,
      insight: {
        id: 'new-customers-this-week',
        icon: 'fa-user-plus',
        iconColor: 'green',
        title: 'New Customers',
        body: `${newCustomersThisWeek} new customer${newCustomersThisWeek === 1 ? '' : 's'} this week`,
        href: '/customers',
      },
    })
  }

  // 10. Balance Cleared
  if (fullySettledToday.length > 0) {
    const featured = fullySettledToday[0]
    candidates.push({
      priority: 10,
      insight: {
        id: 'customer-fully-settled',
        icon: 'fa-circle-check',
        iconColor: 'green',
        title: 'Balance Cleared',
        body: `${featured.name} fully settled their balance`,
        sub: fullySettledToday.length > 1 ? `+${fullySettledToday.length - 1} more customer${fullySettledToday.length - 1 === 1 ? '' : 's'} settled today` : undefined,
        href: `/customers/${featured.id}`,
      },
    })
  }

  // 11. Outstanding Reduced
  if (outstandingBeforeMonth > 0 && outstandingNow < outstandingBeforeMonth) {
    const drop = outstandingBeforeMonth - outstandingNow
    const pct = Math.round((drop / outstandingBeforeMonth) * 100)
    candidates.push({
      priority: 11,
      insight: {
        id: 'outstanding-trend-improved',
        icon: 'fa-arrow-trend-down',
        iconColor: 'green',
        title: 'Outstanding Reduced',
        body: `Outstanding dropped from ₹${formatCurrency(outstandingBeforeMonth)} to ₹${formatCurrency(outstandingNow)}`,
        sub: `-${pct}% this month`,
        href: '/reports?period=month',
      },
    })
  }

  // 12. Customer Concentration
  if (topConcentration && topConcentration.pct >= 30) {
    candidates.push({
      priority: 12,
      insight: {
        id: 'customer-concentration',
        icon: 'fa-triangle-exclamation',
        iconColor: 'orange',
        title: 'Customer Concentration',
        body: `${topConcentration.name} owes ${topConcentration.pct}% of total outstanding (₹${formatCurrency(topConcentration.balance)})`,
        href: `/customers/${topConcentration.customerId}`,
      },
    })
  }

  candidates.sort((a, b) => a.priority - b.priority)

  // Reserve 1 slot for green, fight reds for the other 2
  const reds = candidates.filter((c) => c.priority <= 6)
  const greens = candidates.filter((c) => c.priority > 6)

  let result: Array<{ priority: number; insight: Insight }>

  if (greens.length > 0) {
    result = [greens[0]]
    for (const r of reds) {
      if (result.length >= 3) break
      result.push(r)
    }
    for (const g of greens.slice(1)) {
      if (result.length >= 3) break
      result.push(g)
    }
  } else {
    result = reds.slice(0, 3)
  }

  return result.map((c) => c.insight)
}
