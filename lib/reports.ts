import { supabase } from './supabase'
import { percentTrend } from './utils'

export interface PeriodTotals {
  credit: number
  collected: number
  count: number
}

export interface ReportData {
  daily: PeriodTotals
  dailyTrend: { credit?: number; collected?: number }
  weekly: PeriodTotals
  weeklyTrend: { credit?: number; collected?: number }
  monthly: PeriodTotals
  monthlyTrend: { credit?: number; collected?: number }
}

function emptyTotals(): PeriodTotals {
  return { credit: 0, collected: 0, count: 0 }
}

function bucket(totals: PeriodTotals, amount: number) {
  if (amount > 0) totals.credit += amount
  else totals.collected += Math.abs(amount)
  totals.count += 1
}

export async function loadReportData(): Promise<ReportData | null> {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return null

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(thisWeekStart.getDate() - 7)

  const lastWeekStart = new Date(now)
  lastWeekStart.setDate(lastWeekStart.getDate() - 14)

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const earliestNeeded = new Date(
    Math.min(yesterdayStart.getTime(), lastWeekStart.getTime(), lastMonthStart.getTime())
  )

  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)

  const ids = (customers || []).map((c) => c.id)

  const daily = emptyTotals()
  const yesterday = emptyTotals()
  const weekly = emptyTotals()
  const lastWeek = emptyTotals()
  const monthly = emptyTotals()
  const lastMonth = emptyTotals()

  if (ids.length > 0) {
    const { data: txData } = await supabase
      .from('transactions')
      .select('amount, created_at, customer_id')
      .in('customer_id', ids)
      .gte('created_at', earliestNeeded.toISOString())

    for (const t of txData || []) {
      const createdAt = new Date(t.created_at)
      const amount = t.amount || 0

      if (createdAt >= todayStart) bucket(daily, amount)
      else if (createdAt >= yesterdayStart) bucket(yesterday, amount)

      if (createdAt >= thisWeekStart) bucket(weekly, amount)
      else if (createdAt >= lastWeekStart) bucket(lastWeek, amount)

      if (createdAt >= thisMonthStart) bucket(monthly, amount)
      else if (createdAt >= lastMonthStart) bucket(lastMonth, amount)
    }
  }

  return {
    daily,
    dailyTrend: {
      credit: percentTrend(daily.credit, yesterday.credit),
      collected: percentTrend(daily.collected, yesterday.collected),
    },
    weekly,
    weeklyTrend: {
      credit: percentTrend(weekly.credit, lastWeek.credit),
      collected: percentTrend(weekly.collected, lastWeek.collected),
    },
    monthly,
    monthlyTrend: {
      credit: percentTrend(monthly.credit, lastMonth.credit),
      collected: percentTrend(monthly.collected, lastMonth.collected),
    },
  }
}
