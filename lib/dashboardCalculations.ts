import { startOfDay, startOfWeek, daysSince, calculateOverdueDays, daysUntilOverdue } from './utils'
import type { DashboardCustomer, DashboardTx, DashboardThresholds } from '@/app/DashboardPage'

export interface DashboardMetrics {
  // DashboardSummary
  todayCredit: number
  collectedToday: number
  totalCredit: number
  totalCollection: number
  outstanding: number
  overdueCount: number
  collectionRate: number

  // NeedsAttention
  overdueCustomers: Array<{
    id: string
    name: string
    phone?: string
    balance: number
  }>

  // InsightsFeed (pre-computed insights candidates)
  creditLimitBreach: { customerId: string; balance: number; limit: number; overage: number } | null
  slowestPayer: { customerId: string; ratio: number; credit: number; paid: number } | null
  dueThisWeekCount: number
  fastestRiser: { customerId: string; rise: number; isToday: boolean } | null
  staleCustomer: { customerId: string; days: number } | null
  netToday: number
  paymentsTodayAmount: number
  creditsTodayAmount: number
  todayLargePayment: { amount: number; customerId: string; txId: string } | null
  fullySettledToday: DashboardCustomer[]
  bestCollectionWeek: { currentWeek: number; bestPastWeek: number }
  outstandingBeforeMonth: number
  outstandingNow: number

  // Helper lookups
  balances: Record<string, number>
  nameById: Map<string, string>
}

export function calculateDashboardMetrics(
  customers: DashboardCustomer[],
  transactions: DashboardTx[],
  thresholds: DashboardThresholds
): DashboardMetrics {
  const now = new Date()
  const todayStart = startOfDay(now)
  const sevenDaysAgoStart = startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
  const ninetyDaysAgoStart = startOfDay(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000))
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentWeekKey = startOfWeek(now).getTime()

  // Single-pass through transactions to build all needed data
  const balances: Record<string, number> = {}
  const balancesBeforeToday: Record<string, number> = {}
  const balances7DaysAgo: Record<string, number> = {}
  const balancesBeforeMonth: Record<string, number> = {}
  const txByCustomer: Record<string, DashboardTx[]> = {}
  const creditGiven90d: Record<string, number> = {}
  const paid90d: Record<string, number> = {}
  const lastPaymentDate: Record<string, string> = {}
  const firstTxDate: Record<string, string> = {}
  const weeklyCollections: Record<number, number> = {}

  let creditsTodayAmount = 0
  let paymentsTodayAmount = 0
  let todayLargePayment: { amount: number; customerId: string; txId: string } | null = null

  const todayStartMs = todayStart.getTime()
  const sevenDaysAgoMs = sevenDaysAgoStart.getTime()
  const ninetyDaysAgoMs = ninetyDaysAgoStart.getTime()
  const monthStartMs = monthStart.getTime()

  for (const t of transactions) {
    const cid = t.customer_id
    const amount = t.amount || 0
    const txDate = t.date || t.created_at

    // Update running balance
    balances[cid] = (balances[cid] || 0) + amount

    // Track transactions by customer (once per customer on first tx)
    if (!txByCustomer[cid]) {
      txByCustomer[cid] = []
    }
    txByCustomer[cid].push(t)

    if (!firstTxDate[cid]) {
      firstTxDate[cid] = txDate
    }

    const ts = new Date(txDate).getTime()

    // Snapshot balances at specific time boundaries
    if (ts < todayStartMs) {
      balancesBeforeToday[cid] = (balancesBeforeToday[cid] || 0) + amount
    }
    if (ts < sevenDaysAgoMs) {
      balances7DaysAgo[cid] = (balances7DaysAgo[cid] || 0) + amount
    }
    if (ts < monthStartMs) {
      balancesBeforeMonth[cid] = (balancesBeforeMonth[cid] || 0) + amount
    }

    // 90-day credit/payment tracking
    if (ts >= ninetyDaysAgoMs) {
      if (amount > 0) {
        creditGiven90d[cid] = (creditGiven90d[cid] || 0) + amount
      } else {
        paid90d[cid] = (paid90d[cid] || 0) + Math.abs(amount)
      }
    }

    // Track payments for weekly collections
    if (amount < 0) {
      lastPaymentDate[cid] = txDate
      const weekKey = startOfWeek(new Date(txDate)).getTime()
      weeklyCollections[weekKey] = (weeklyCollections[weekKey] || 0) + Math.abs(amount)
    }

    // Track today's activity
    if (ts >= todayStartMs) {
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

  // Apply opening balances
  const nameById = new Map<string, string>()
  const overdueCustomersMap: Record<string, { id: string; name: string; phone?: string; balance: number }> = {}

  let totalCredit = 0
  let totalCollection = 0
  let outstanding = 0
  let overdueCount = 0
  let creditLimitBreach: { customerId: string; balance: number; limit: number; overage: number } | null = null
  let slowestPayer: { customerId: string; ratio: number; credit: number; paid: number } | null = null
  let dueThisWeekCount = 0
  let fastestRiser: { customerId: string; rise: number; isToday: boolean } | null = null
  let staleCustomer: { customerId: string; days: number } | null = null
  let outstandingBeforeMonth = 0
  let outstandingNow = 0

  for (const c of customers) {
    nameById.set(c.id, c.name)
    const ob = c.opening_balance || 0
    balances[c.id] = ob + (balances[c.id] || 0)
    balancesBeforeToday[c.id] = ob + (balancesBeforeToday[c.id] || 0)
    balances7DaysAgo[c.id] = ob + (balances7DaysAgo[c.id] || 0)
    balancesBeforeMonth[c.id] = ob + (balancesBeforeMonth[c.id] || 0)

    const balance = balances[c.id]
    const txList = txByCustomer[c.id] || []

    // Summary metrics
    totalCredit += ob
    if (balance > 0) {
      outstanding += balance
      outstandingNow += balance

      if (isCustomerOverdue(balance, txList, thresholds.thresholdDays, thresholds.resetThresholdPct)) {
        overdueCount++
        overdueCustomersMap[c.id] = { id: c.id, name: c.name, phone: c.phone, balance }
      }
    }

    if (balancesBeforeMonth[c.id] > 0) {
      outstandingBeforeMonth += balancesBeforeMonth[c.id]
    }

    // 1. Credit Limit Exceeded
    if (c.credit_limit != null && balance > c.credit_limit) {
      const overage = balance - c.credit_limit
      if (!creditLimitBreach || overage > creditLimitBreach.overage) {
        creditLimitBreach = { customerId: c.id, balance, limit: c.credit_limit, overage }
      }
    }

    // 2. Slow Paying Customer
    const credit = creditGiven90d[c.id] || 0
    if (credit > 0) {
      const paid = paid90d[c.id] || 0
      const ratio = paid / credit
      if (ratio * 100 < thresholds.slowPayingRatioPct) {
        if (!slowestPayer || ratio < slowestPayer.ratio) {
          slowestPayer = { customerId: c.id, ratio, credit, paid }
        }
      }
    }

    // 3. Due This Week
    if (balance > 0) {
      const remaining = daysUntilOverdue(balance, txList, thresholds.thresholdDays, thresholds.resetThresholdPct)
      if (remaining !== null && remaining >= 0 && remaining <= 3) {
        dueThisWeekCount++
      }
    }

    // 4. Balance Rising Fast
    const rise = (balances[c.id] || 0) - (balances7DaysAgo[c.id] || 0)
    if (rise > thresholds.balanceRiseThreshold) {
      if (!fastestRiser || rise > fastestRiser.rise) {
        // Whether the rise is fresh (mostly happened today) or has been
        // building up over the week - decides whether the insight reads
        // "today" or "this week".
        const riseToday = (balances[c.id] || 0) - (balancesBeforeToday[c.id] || 0)
        fastestRiser = { customerId: c.id, rise, isToday: riseToday > thresholds.balanceRiseThreshold }
      }
    }

    // 5. No Payment for 30+ Days
    if (balance > 0) {
      const anchor = lastPaymentDate[c.id] || firstTxDate[c.id]
      if (anchor) {
        const days = daysSince(anchor)
        if (days >= 30) {
          if (!staleCustomer || days > staleCustomer.days) {
            staleCustomer = { customerId: c.id, days }
          }
        }
      }
    }
  }

  // Sort and slice overdue customers
  const overdueCustomers = Object.values(overdueCustomersMap).sort((a, b) => b.balance - a.balance).slice(0, 3)

  // Calculate collection rate
  const collectionRate = totalCredit > 0 ? Math.round((totalCollection / totalCredit) * 100) : 0
  totalCollection = paymentsTodayAmount // TODO: check if this should be cumulative

  // Best Collection Week
  const currentWeekCollection = weeklyCollections[currentWeekKey] || 0
  let bestPastWeek = 0
  for (const [weekKey, amount] of Object.entries(weeklyCollections)) {
    if (Number(weekKey) === currentWeekKey) continue
    if (amount > bestPastWeek) bestPastWeek = amount
  }

  // Fully Settled Today
  const fullySettledToday = customers.filter((c) => {
    const before = balancesBeforeToday[c.id] ?? (c.opening_balance || 0)
    const current = balances[c.id] || 0
    return before > 0 && current <= 0
  })

  const netToday = paymentsTodayAmount - creditsTodayAmount

  return {
    todayCredit: creditsTodayAmount,
    collectedToday: paymentsTodayAmount,
    totalCredit,
    totalCollection,
    outstanding,
    overdueCount,
    collectionRate,
    overdueCustomers,
    creditLimitBreach,
    slowestPayer,
    dueThisWeekCount,
    fastestRiser,
    staleCustomer,
    netToday,
    paymentsTodayAmount,
    creditsTodayAmount,
    todayLargePayment,
    fullySettledToday,
    bestCollectionWeek: { currentWeek: currentWeekCollection, bestPastWeek },
    outstandingBeforeMonth,
    outstandingNow,
    balances,
    nameById,
  }
}

function isCustomerOverdue(
  balance: number,
  transactions: DashboardTx[],
  thresholdDays: number,
  resetThresholdPct: number
): boolean {
  if (balance <= 0) return false
  return calculateOverdueDays(balance, transactions, thresholdDays, resetThresholdPct) > 0
}
