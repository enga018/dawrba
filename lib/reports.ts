import { supabase } from './supabase'
import { percentTrend } from './utils'

export interface LargestTx {
  amount: number
  customerName: string
  customerId: string
}

export interface PeriodTotals {
  credit: number
  collected: number
  count: number
  largestCredit?: LargestTx
  largestCollection?: LargestTx
}

export interface Schedule {
  dailyTime: string
  weeklyDay: string
  weeklyTime: string
  monthlyTime: string
}

export interface ReportData {
  daily: PeriodTotals
  dailyTrend: { credit?: number; collected?: number }
  dailyComplete: boolean
  dailyCompleteAt: Date
  weekly: PeriodTotals
  weeklyTrend: { credit?: number; collected?: number }
  weeklyComplete: boolean
  weeklyCompleteAt: Date
  monthly: PeriodTotals
  monthlyTrend: { credit?: number; collected?: number }
  monthlyComplete: boolean
  monthlyCompleteAt: Date
}

function emptyTotals(): PeriodTotals {
  return { credit: 0, collected: 0, count: 0 }
}

function bucket(totals: PeriodTotals, amount: number) {
  if (amount > 0) totals.credit += amount
  else totals.collected += Math.abs(amount)
  totals.count += 1
}

function bucketWithLargest(
  totals: PeriodTotals,
  amount: number,
  customerId: string,
  customerName: string
) {
  bucket(totals, amount)

  if (amount > 0) {
    if (!totals.largestCredit || amount > totals.largestCredit.amount) {
      totals.largestCredit = { amount, customerId, customerName }
    }
  } else {
    const absAmount = Math.abs(amount)
    if (!totals.largestCollection || absAmount > totals.largestCollection.amount) {
      totals.largestCollection = { amount: absAmount, customerId, customerName }
    }
  }
}

function applyTime(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number)
  const result = new Date(date)
  result.setHours(h, m, 0, 0)
  return result
}

function getDayBoundaries(now: Date, dailyTime: string) {
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const todayCompleteAt = applyTime(now, dailyTime)

  return { todayStart, yesterdayStart, todayCompleteAt }
}

function getWeekBoundaries(now: Date, weeklyDay: string, weeklyTime: string) {
  const targetEndDay = weeklyDay === 'saturday' ? 6 : 0 // Date.getDay(): 0 = Sunday, 6 = Saturday
  const daysUntilEnd = (targetEndDay - now.getDay() + 7) % 7

  const thisWeekCompleteAt = applyTime(now, weeklyTime)
  thisWeekCompleteAt.setDate(thisWeekCompleteAt.getDate() + daysUntilEnd)

  const thisWeekStart = new Date(thisWeekCompleteAt)
  thisWeekStart.setDate(thisWeekStart.getDate() - 6)
  thisWeekStart.setHours(0, 0, 0, 0)

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  return { thisWeekStart, lastWeekStart, thisWeekCompleteAt }
}

function getMonthBoundaries(now: Date, monthlyTime: string) {
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const thisMonthCompleteAt = applyTime(lastDayOfMonth, monthlyTime)

  return { thisMonthStart, lastMonthStart, thisMonthCompleteAt }
}

export async function loadReportData(schedule: Schedule): Promise<ReportData | null> {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return null

  const now = new Date()

  const { todayStart, yesterdayStart, todayCompleteAt } = getDayBoundaries(now, schedule.dailyTime)
  const { thisWeekStart, lastWeekStart, thisWeekCompleteAt } = getWeekBoundaries(
    now,
    schedule.weeklyDay,
    schedule.weeklyTime
  )
  const { thisMonthStart, lastMonthStart, thisMonthCompleteAt } = getMonthBoundaries(
    now,
    schedule.monthlyTime
  )

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
      .select('amount, created_at, customer_id, customers!inner(name)')
      .in('customer_id', ids)
      .gte('created_at', earliestNeeded.toISOString())

    for (const t of txData || []) {
      const createdAt = new Date(t.created_at)
      const amount = t.amount || 0
      const customerName = (t.customers as unknown as { name: string }).name

      if (createdAt >= todayStart) bucketWithLargest(daily, amount, t.customer_id, customerName)
      else if (createdAt >= yesterdayStart) bucket(yesterday, amount)

      if (createdAt >= thisWeekStart) bucketWithLargest(weekly, amount, t.customer_id, customerName)
      else if (createdAt >= lastWeekStart) bucket(lastWeek, amount)

      if (createdAt >= thisMonthStart) bucketWithLargest(monthly, amount, t.customer_id, customerName)
      else if (createdAt >= lastMonthStart) bucket(lastMonth, amount)
    }
  }

  const dailyComplete = now >= todayCompleteAt
  const weeklyComplete = now >= thisWeekCompleteAt
  const monthlyComplete = now >= thisMonthCompleteAt

  return {
    daily,
    dailyTrend: dailyComplete
      ? {
          credit: percentTrend(daily.credit, yesterday.credit),
          collected: percentTrend(daily.collected, yesterday.collected),
        }
      : {},
    dailyComplete,
    dailyCompleteAt: todayCompleteAt,
    weekly,
    weeklyTrend: weeklyComplete
      ? {
          credit: percentTrend(weekly.credit, lastWeek.credit),
          collected: percentTrend(weekly.collected, lastWeek.collected),
        }
      : {},
    weeklyComplete,
    weeklyCompleteAt: thisWeekCompleteAt,
    monthly,
    monthlyTrend: monthlyComplete
      ? {
          credit: percentTrend(monthly.credit, lastMonth.credit),
          collected: percentTrend(monthly.collected, lastMonth.collected),
        }
      : {},
    monthlyComplete,
    monthlyCompleteAt: thisMonthCompleteAt,
  }
}
