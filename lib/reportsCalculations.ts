import { startOfDay, startOfWeek, calculateOverdueDays, daysUntilOverdue } from './utils'

export interface Customer {
  id: string
  name: string
  opening_balance: number
  created_at: string
}

export interface Transaction {
  customer_id: string
  amount: number
  date?: string
  created_at: string
}

export interface OverdueCustomer {
  name: string
  balance: number
}

export interface HighestTx {
  amount: number
  customerName: string
}

export interface PeriodStats {
  creditGiven: number
  collected: number
  outstanding: number
  txCount: number
  avgTransactionSize: number
  newCustomers: number
}

export interface ReportMetrics {
  creditGiven: number
  collected: number
  outstanding: number
  txCount: number
  avgTransactionSize: number
  newCustomers: number
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

type Period = 'today' | 'week' | 'month'

export function calculateReportMetrics(
  customers: Customer[],
  transactions: Transaction[],
  period: Period,
  thresholdDays: number,
  resetThresholdPct: number,
  weekStartDay: 0 | 1 = 0
): ReportMetrics {
  const nameById = new Map(customers.map((c) => [c.id, c.name]))
  const now = new Date()

  // Calculate period boundaries
  const periodStart = getPeriodStart(now, period, weekStartDay)
  const prevEnd = periodStart - 1
  const prevStart = getPreviousPeriodStart(now, period, weekStartDay)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  // Initialize data structures for single-pass calculation
  const balances: Record<string, number> = {}
  const balancesBeforeMonth: Record<string, number> = {}
  const txByCustomer: Record<string, Transaction[]> = {}
  const collectedByCustomer: Record<string, number> = {}

  // Aggregate all transaction data in single pass
  let creditGiven = 0,
    collected = 0
  let prevCredit = 0,
    prevCollected = 0
  let txCount = 0,
    prevTxCount = 0
  let highestCreditTx: { amount: number; customerId: string } | null = null
  let highestCollectionTx: { amount: number; customerId: string } | null = null
  let totalCreditAllTime = 0,
    totalCollectedAllTime = 0
  let allTimeHighestCreditTx: { amount: number; customerId: string } | null = null
  let allTimeHighestCollectionTx: { amount: number; customerId: string } | null = null
  const newCustomersThisPeriod = new Set<string>()
  const newCustomersPrevPeriod = new Set<string>()

  // Initialize customer data
  for (const c of customers) {
    balances[c.id] = c.opening_balance || 0
    txByCustomer[c.id] = []
    const createdTs = new Date(c.created_at).getTime()
    if (createdTs >= periodStart) newCustomersThisPeriod.add(c.id)
    else if (createdTs >= prevStart && createdTs <= prevEnd) newCustomersPrevPeriod.add(c.id)
  }

  // Single pass through all transactions
  for (const t of transactions) {
    const cid = t.customer_id
    const amount = t.amount || 0
    const ts = new Date(t.date || t.created_at).getTime()

    balances[cid] = (balances[cid] || 0) + amount
    txByCustomer[cid].push(t)

    // Track balances before month
    if (ts < monthStart) {
      balancesBeforeMonth[cid] = (balancesBeforeMonth[cid] || 0) + amount
    }

    // All-time aggregations
    if (amount > 0) {
      totalCreditAllTime += amount
      if (!allTimeHighestCreditTx || amount > allTimeHighestCreditTx.amount) {
        allTimeHighestCreditTx = { amount, customerId: cid }
      }
    } else {
      const abs = Math.abs(amount)
      totalCollectedAllTime += abs
      collectedByCustomer[cid] = (collectedByCustomer[cid] || 0) + abs
      if (!allTimeHighestCollectionTx || abs > allTimeHighestCollectionTx.amount) {
        allTimeHighestCollectionTx = { amount: abs, customerId: cid }
      }
    }

    // Current period
    if (ts >= periodStart) {
      txCount++
      if (amount > 0) {
        creditGiven += amount
        if (!highestCreditTx || amount > highestCreditTx.amount) {
          highestCreditTx = { amount, customerId: cid }
        }
      } else {
        const abs = Math.abs(amount)
        collected += abs
        if (!highestCollectionTx || abs > highestCollectionTx.amount) {
          highestCollectionTx = { amount: abs, customerId: cid }
        }
      }
    } else if (ts >= prevStart && ts <= prevEnd) {
      prevTxCount++
      if (amount > 0) prevCredit += amount
      else prevCollected += Math.abs(amount)
    }
  }

  // Calculate customer-level metrics
  let outstanding = 0
  let fullySettledThisMonth = 0
  let overdueAmount = 0
  let highestOutstandingData: { amount: number; customerId: string } | null = null
  let mostPaymentsTx: { amount: number; customerId: string } | null = null
  const overdueList: OverdueCustomer[] = []
  let dueTodayCount = 0

  for (const c of customers) {
    const balance = balances[c.id]
    const balanceBeforeMonth = (c.opening_balance || 0) + (balancesBeforeMonth[c.id] || 0)

    if (balance > 0) {
      outstanding += balance

      // Check overdue status
      const overdueDays = calculateOverdueDays(balance, txByCustomer[c.id], thresholdDays, resetThresholdPct)
      if (overdueDays > 0) {
        overdueAmount += balance
        overdueList.push({ name: c.name, balance })
      } else {
        // Check if due today
        const daysRemaining = daysUntilOverdue(balance, txByCustomer[c.id], thresholdDays, resetThresholdPct)
        if (daysRemaining === 0) {
          dueTodayCount++
        }
      }

      if (!highestOutstandingData || balance > highestOutstandingData.amount) {
        highestOutstandingData = { amount: balance, customerId: c.id }
      }
    }

    // Check if settled this month
    if (balanceBeforeMonth > 0 && balance <= 0) {
      fullySettledThisMonth++
    }

    // Track highest payer
    const totalPaidByCustomer = collectedByCustomer[c.id] || 0
    if (totalPaidByCustomer > 0 && (!mostPaymentsTx || totalPaidByCustomer > mostPaymentsTx.amount)) {
      mostPaymentsTx = { amount: totalPaidByCustomer, customerId: c.id }
    }
  }

  // Sort overdue by balance descending
  overdueList.sort((a, b) => b.balance - a.balance)

  // Calculate rates
  totalCreditAllTime = (customers || []).reduce((sum, c) => sum + (c.opening_balance || 0), totalCreditAllTime)
  const collectionRateAllTime = totalCreditAllTime > 0 ? Math.round((totalCollectedAllTime / totalCreditAllTime) * 100) : 0
  const overduePercent = outstanding > 0 ? Math.round((overdueAmount / outstanding) * 100) : 0

  const avgTransactionSize = txCount > 0 ? Math.round((creditGiven + collected) / txCount) : 0
  const prevAvgTransactionSize = prevTxCount > 0 ? Math.round((prevCredit + prevCollected) / prevTxCount) : 0

  return {
    creditGiven,
    collected,
    outstanding,
    txCount,
    avgTransactionSize,
    newCustomers: newCustomersThisPeriod.size,
    prev: {
      creditGiven: prevCredit,
      collected: prevCollected,
      outstanding: 0,
      txCount: prevTxCount,
      avgTransactionSize: prevAvgTransactionSize,
      newCustomers: newCustomersPrevPeriod.size,
    },
    overdueCustomers: overdueList.slice(0, 3),
    highestCredit: highestCreditTx ? { amount: highestCreditTx.amount, customerName: nameById.get(highestCreditTx.customerId) || 'Unknown' } : null,
    highestCollection: highestCollectionTx ? { amount: highestCollectionTx.amount, customerName: nameById.get(highestCollectionTx.customerId) || 'Unknown' } : null,
    collectionRateAllTime,
    totalCreditAllTime,
    totalCollectedAllTime,
    overduePercent,
    allTimeHighestCredit: allTimeHighestCreditTx ? { amount: allTimeHighestCreditTx.amount, customerName: nameById.get(allTimeHighestCreditTx.customerId) || 'Unknown' } : null,
    allTimeHighestCollection: allTimeHighestCollectionTx ? { amount: allTimeHighestCollectionTx.amount, customerName: nameById.get(allTimeHighestCollectionTx.customerId) || 'Unknown' } : null,
    highestOutstanding: highestOutstandingData && highestOutstandingData.amount > 0 ? { amount: highestOutstandingData.amount, customerName: nameById.get(highestOutstandingData.customerId) || 'Unknown' } : null,
    mostPayments: mostPaymentsTx ? { amount: mostPaymentsTx.amount, customerName: nameById.get(mostPaymentsTx.customerId) || 'Unknown' } : null,
    fullySettledThisMonth,
    overdueCount: overdueList.length,
    dueTodayCount,
    overdueAmount,
  }
}

function getPeriodStart(now: Date, period: Period, weekStartDay: 0 | 1): number {
  if (period === 'today') return startOfDay(now).getTime()
  if (period === 'week') return startOfWeek(now, weekStartDay).getTime()
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

function getPreviousPeriodStart(now: Date, period: Period, weekStartDay: 0 | 1): number {
  if (period === 'today') return startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000)).getTime()
  if (period === 'week') return startOfWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), weekStartDay).getTime()
  return new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
}
