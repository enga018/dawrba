import { startOfDay, startOfWeek, calculateOverdueDays, daysUntilOverdue } from './utils'
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
  paymentsTodayAmount: number
  creditsTodayAmount: number
  todayLargePayment: { amount: number; customerId: string; txId: string } | null
  todayLargeCredit: { amount: number; customerId: string; txId: string } | null
  fullySettledToday: DashboardCustomer[]
  bestCreditAllTime: { amount: number; customerId: string; txId: string } | null
  bestCreditThisMonth: { amount: number; customerId: string; txId: string } | null
  bestCreditThisWeek: { amount: number; customerId: string; txId: string } | null
  bestPastMonthCredit: number
  bestPastWeekCredit: number
  bestPaymentAllTime: { amount: number; customerId: string; txId: string } | null
  bestPaymentThisMonth: { amount: number; customerId: string; txId: string } | null
  bestPaymentThisWeek: { amount: number; customerId: string; txId: string } | null
  bestPastMonthPayment: number
  bestPastWeekPayment: number
  outstandingBeforeMonth: number
  outstandingNow: number
  outstandingChange: { drop: number; pct: number } | null
  collectionRate90d: number
  newCustomersThisWeek: number
  topConcentration: { name: string; balance: number; pct: number } | null

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
  const weekStartDay = thresholds.weekStartDay ?? 0
  const currentWeekKey = startOfWeek(now, weekStartDay).getTime()
  const currentMonthKey = monthStart.getTime()

  // Single-pass through transactions to build all needed data
  const balances: Record<string, number> = {}
  const balancesBeforeToday: Record<string, number> = {}
  const balances7DaysAgo: Record<string, number> = {}
  const balancesBeforeMonth: Record<string, number> = {}
  const txByCustomer: Record<string, DashboardTx[]> = {}
  const creditGiven90d: Record<string, number> = {}
  const paid90d: Record<string, number> = {}
  const allTimeCreditGiven: Record<string, number> = {}
  const allTimePayments: Record<string, number> = {}
  const lastPaymentDate: Record<string, string> = {}
  const firstTxDate: Record<string, string> = {}
  const weeklyCollections: Record<number, number> = {}
  const monthlyBestCredit: Record<number, { amount: number; customerId: string; txId: string }> = {}
  const monthlyBestPayment: Record<number, { amount: number; customerId: string; txId: string }> = {}
  const weeklyBestCredit: Record<number, { amount: number; customerId: string; txId: string }> = {}
  const weeklyBestPayment: Record<number, { amount: number; customerId: string; txId: string }> = {}

  let creditsTodayAmount = 0
  let paymentsTodayAmount = 0
  let todayLargePayment: { amount: number; customerId: string; txId: string } | null = null
  let todayLargeCredit: { amount: number; customerId: string; txId: string } | null = null
  let bestCreditAllTime: { amount: number; customerId: string; txId: string } | null = null
  let bestPaymentAllTime: { amount: number; customerId: string; txId: string } | null = null

  const todayStartMs = todayStart.getTime()
  const sevenDaysAgoMs = sevenDaysAgoStart.getTime()
  const ninetyDaysAgoMs = ninetyDaysAgoStart.getTime()
  const monthStartMs = monthStart.getTime()

  for (const t of transactions) {
    const cid = t.customer_id
    const amount = t.amount || 0
    const txDate = t.date || t.created_at

    balances[cid] = (balances[cid] || 0) + amount

    if (!txByCustomer[cid]) {
      txByCustomer[cid] = []
    }
    txByCustomer[cid].push(t)

    if (!firstTxDate[cid]) {
      firstTxDate[cid] = txDate
    }

    const ts = new Date(txDate).getTime()

    if (ts < todayStartMs) {
      balancesBeforeToday[cid] = (balancesBeforeToday[cid] || 0) + amount
    }
    if (ts < sevenDaysAgoMs) {
      balances7DaysAgo[cid] = (balances7DaysAgo[cid] || 0) + amount
    }
    if (ts < monthStartMs) {
      balancesBeforeMonth[cid] = (balancesBeforeMonth[cid] || 0) + amount
    }

    if (ts >= ninetyDaysAgoMs) {
      if (amount > 0) {
        creditGiven90d[cid] = (creditGiven90d[cid] || 0) + amount
      } else {
        paid90d[cid] = (paid90d[cid] || 0) + Math.abs(amount)
      }
    }

    if (amount > 0) {
      allTimeCreditGiven[cid] = (allTimeCreditGiven[cid] || 0) + amount
      const absAmount = amount
      if (!bestCreditAllTime || absAmount > bestCreditAllTime.amount) {
        bestCreditAllTime = { amount: absAmount, customerId: cid, txId: t.id }
      }
      const monthKey = new Date(new Date(txDate).getFullYear(), new Date(txDate).getMonth(), 1).getTime()
      if (!monthlyBestCredit[monthKey] || absAmount > monthlyBestCredit[monthKey].amount) {
        monthlyBestCredit[monthKey] = { amount: absAmount, customerId: cid, txId: t.id }
      }
      const weekKey = startOfWeek(new Date(txDate), weekStartDay).getTime()
      if (!weeklyBestCredit[weekKey] || absAmount > weeklyBestCredit[weekKey].amount) {
        weeklyBestCredit[weekKey] = { amount: absAmount, customerId: cid, txId: t.id }
      }
    } else {
      allTimePayments[cid] = (allTimePayments[cid] || 0) + Math.abs(amount)
      const absAmount = Math.abs(amount)
      if (!bestPaymentAllTime || absAmount > bestPaymentAllTime.amount) {
        bestPaymentAllTime = { amount: absAmount, customerId: cid, txId: t.id }
      }
      const monthKey = new Date(new Date(txDate).getFullYear(), new Date(txDate).getMonth(), 1).getTime()
      if (!monthlyBestPayment[monthKey] || absAmount > monthlyBestPayment[monthKey].amount) {
        monthlyBestPayment[monthKey] = { amount: absAmount, customerId: cid, txId: t.id }
      }
      const weekKey = startOfWeek(new Date(txDate), weekStartDay).getTime()
      if (!weeklyBestPayment[weekKey] || absAmount > weeklyBestPayment[weekKey].amount) {
        weeklyBestPayment[weekKey] = { amount: absAmount, customerId: cid, txId: t.id }
      }
    }

    if (amount < 0) {
      lastPaymentDate[cid] = txDate
      const weekKey = startOfWeek(new Date(txDate), weekStartDay).getTime()
      weeklyCollections[weekKey] = (weeklyCollections[weekKey] || 0) + Math.abs(amount)
    }

    if (ts >= todayStartMs) {
      if (amount > 0) {
        creditsTodayAmount += amount
        if (amount >= thresholds.largePaymentThreshold && (!todayLargeCredit || amount > todayLargeCredit.amount)) {
          todayLargeCredit = { amount, customerId: cid, txId: t.id }
        }
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
  let outstandingBeforeMonth = 0
  let outstandingNow = 0
  let totalCredit90d = 0
  let totalPayment90d = 0
  let newCustomersThisWeek = 0
  let topConcentrationName = ''
  let topConcentrationBalance = 0

  for (const c of customers) {
    nameById.set(c.id, c.name)
    const ob = c.opening_balance || 0
    balances[c.id] = ob + (balances[c.id] || 0)
    balancesBeforeToday[c.id] = ob + (balancesBeforeToday[c.id] || 0)
    balances7DaysAgo[c.id] = ob + (balances7DaysAgo[c.id] || 0)
    balancesBeforeMonth[c.id] = ob + (balancesBeforeMonth[c.id] || 0)

    totalCredit90d += creditGiven90d[c.id] || 0
    totalPayment90d += paid90d[c.id] || 0

    if (new Date(c.created_at).getTime() >= sevenDaysAgoMs) {
      newCustomersThisWeek++
    }

    const balance = balances[c.id]
    const txList = txByCustomer[c.id] || []

    totalCredit += ob + (allTimeCreditGiven[c.id] || 0)
    totalCollection += allTimePayments[c.id] || 0

    if (balance > 0) {
      outstanding += balance
      outstandingNow += balance
      if (balance > topConcentrationBalance) {
        topConcentrationName = c.name
        topConcentrationBalance = balance
      }

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
        const riseToday = (balances[c.id] || 0) - (balancesBeforeToday[c.id] || 0)
        fastestRiser = { customerId: c.id, rise, isToday: riseToday > thresholds.balanceRiseThreshold }
      }
    }
  }

  const collectionRate90d = totalCredit90d > 0 ? Math.round((totalPayment90d / totalCredit90d) * 100) : 0

  const topConcentration: { name: string; balance: number; pct: number } | null =
    topConcentrationBalance > 0 && outstanding > 0
      ? { name: topConcentrationName, balance: topConcentrationBalance, pct: Math.round((topConcentrationBalance / outstanding) * 100) }
      : null

  const outstandingChange: { drop: number; pct: number } | null =
    outstandingBeforeMonth > 0 && outstandingNow > outstandingBeforeMonth
      ? { drop: outstandingNow - outstandingBeforeMonth, pct: Math.round(((outstandingNow - outstandingBeforeMonth) / outstandingBeforeMonth) * 100) }
      : null

  // Sort and slice overdue customers
  const overdueCustomers = Object.values(overdueCustomersMap).sort((a, b) => b.balance - a.balance).slice(0, 3)

  const collectionRate = totalCredit > 0 ? Math.round((totalCollection / totalCredit) * 100) : 0

  // Compute best past month/week records (exclude current periods)
  const currentWeekBestCredit = weeklyBestCredit[currentWeekKey]
  const currentWeekBestPayment = weeklyBestPayment[currentWeekKey]
  const currentMonthBestCredit = monthlyBestCredit[currentMonthKey]
  const currentMonthBestPayment = monthlyBestPayment[currentMonthKey]

  let bestPastMonthCredit = 0
  let bestPastWeekCredit = 0
  let bestPastMonthPayment = 0
  let bestPastWeekPayment = 0

  for (const [key, data] of Object.entries(monthlyBestCredit)) {
    if (Number(key) !== currentMonthKey && data.amount > bestPastMonthCredit) {
      bestPastMonthCredit = data.amount
    }
  }
  for (const [key, data] of Object.entries(monthlyBestPayment)) {
    if (Number(key) !== currentMonthKey && data.amount > bestPastMonthPayment) {
      bestPastMonthPayment = data.amount
    }
  }
  for (const [key, data] of Object.entries(weeklyBestCredit)) {
    if (Number(key) !== currentWeekKey && data.amount > bestPastWeekCredit) {
      bestPastWeekCredit = data.amount
    }
  }
  for (const [key, data] of Object.entries(weeklyBestPayment)) {
    if (Number(key) !== currentWeekKey && data.amount > bestPastWeekPayment) {
      bestPastWeekPayment = data.amount
    }
  }

  // Fully Settled Today
  const fullySettledToday = customers.filter((c) => {
    const before = balancesBeforeToday[c.id] ?? (c.opening_balance || 0)
    const current = balances[c.id] || 0
    return before > 0 && current <= 0
  })

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
    paymentsTodayAmount,
    creditsTodayAmount,
    todayLargePayment,
    todayLargeCredit,
    fullySettledToday,
    bestCreditAllTime,
    bestCreditThisMonth: currentMonthBestCredit || null,
    bestCreditThisWeek: currentWeekBestCredit || null,
    bestPastMonthCredit,
    bestPastWeekCredit,
    bestPaymentAllTime,
    bestPaymentThisMonth: currentMonthBestPayment || null,
    bestPaymentThisWeek: currentWeekBestPayment || null,
    bestPastMonthPayment,
    bestPastWeekPayment,
    outstandingBeforeMonth,
    outstandingNow,
    outstandingChange,
    collectionRate90d,
    newCustomersThisWeek,
    topConcentration,
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
