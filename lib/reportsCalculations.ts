import { startOfDay, startOfWeek, calculateOverdueDays } from './utils'

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
  current: PeriodStats
  previous: PeriodStats
  overdueCustomers: OverdueCustomer[]
  highestCreditThisPeriod: HighestTx | null
  highestCollectionThisPeriod: HighestTx | null
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
  const prevStart = getPreviousPeriodStart(now, period, weekStartDay, prevEnd)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  // Initialize maps for calculations
  const balances: Record<string, number> = {}
  const txByCustomer: Record<string, Transaction[]> = {}
  const customerCreatedDates: Record<string, number> = {}

  // Pre-populate customer data
  for (const c of customers) {
    balances[c.id] = c.opening_balance || 0
    txByCustomer[c.id] = []
    customerCreatedDates[c.id] = new Date(c.created_at).getTime()
  }

  // Aggregate transaction data
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
  let allTimeHighestCredit: { amount: number; customerId: string } | null = null
  let allTimeHighestCollection: { amount: number; customerId: string } | null = null

  const newCustomersThisPeriod = new Set<string>()
  const newCustomersPrevPeriod = new Set<string>()
  const settledThisMonth = new Set<string>()

  for (const t of transactions) {
    const cid = t.customer_id
    const amount = t.amount || 0
    const ts = new Date(t.date || t.created_at).getTime()

    // Update running balance
    balances[cid] = (balances[cid] || 0) + amount
    txByCustomer[cid].push(t)

    // All-time aggregations
    if (amount > 0) {
      totalCreditAllTime += amount
      if (!allTimeHighestCredit || amount > allTimeHighestCredit.amount) {
        allTimeHighestCredit = { amount, customerId: cid }
      }
    } else {
      totalCollectedAllTime += Math.abs(amount)
      if (!allTimeHighestCollection || Math.abs(amount) > allTimeHighestCollection.amount) {
        allTimeHighestCollection = { amount: Math.abs(amount), customerId: cid }
      }
    }

    // Current period aggregations
    if (ts >= periodStart) {
      if (amount > 0) {
        creditGiven += amount
        if (!highestCreditTx || amount > highestCreditTx.amount) {
          highestCreditTx = { amount, customerId: cid }
        }
      } else {
        collected += Math.abs(amount)
        if (!highestCollectionTx || Math.abs(amount) > highestCollectionTx.amount) {
          highestCollectionTx = { amount: Math.abs(amount), customerId: cid }
        }
      }
      txCount++
      if (customerCreatedDates[cid] >= periodStart) {
        newCustomersThisPeriod.add(cid)
      }
    }

    // Previous period aggregations
    if (ts >= prevStart && ts <= prevEnd) {
      if (amount > 0) {
        prevCredit += amount
      } else {
        prevCollected += Math.abs(amount)
      }
      prevTxCount++
      if (customerCreatedDates[cid] >= prevStart && customerCreatedDates[cid] <= prevEnd) {
        newCustomersPrevPeriod.add(cid)
      }
    }

    // Track settlements this month
    if (ts >= monthStart && amount < 0) {
      if ((balances[cid] || 0) <= 0) {
        settledThisMonth.add(cid)
      }
    }
  }

  // Calculate overdue customers and outstanding amount
  const overdueCustomers: OverdueCustomer[] = []
  let overdueCount = 0
  let dueTodayCount = 0
  let overdueAmount = 0
  let totalOutstanding = 0
  let highestOutstandingData: { amount: number; customerId: string } | null = null

  for (const c of customers) {
    const balance = balances[c.id] || 0
    if (balance > 0) {
      totalOutstanding += balance
      if (!highestOutstandingData || balance > highestOutstandingData.amount) {
        highestOutstandingData = { amount: balance, customerId: c.id }
      }

      const overdueDays = calculateOverdueDays(balance, txByCustomer[c.id], thresholdDays, resetThresholdPct)
      if (overdueDays > 0) {
        overdueCount++
        overdueAmount += balance
        overdueCustomers.push({ name: c.name, balance })
      } else if (balance > 0) {
        // Check if due today
        // (implementation of daysUntilOverdue would go here if needed)
        // For now, we focus on the overdue vs active distinction
      }
    }
  }

  // Sort overdueCustomers by balance descending
  overdueCustomers.sort((a, b) => b.balance - a.balance)

  // Calculate rates and percentages
  const collectionRateAllTime = totalCreditAllTime > 0 ? Math.round((totalCollectedAllTime / totalCreditAllTime) * 100) : 0
  const overduePercent = totalOutstanding > 0 ? Math.round((overdueAmount / totalOutstanding) * 100) : 0

  return {
    current: {
      creditGiven,
      collected,
      outstanding: totalOutstanding,
      txCount,
      avgTransactionSize: txCount > 0 ? Math.round(creditGiven / txCount) : 0,
      newCustomers: newCustomersThisPeriod.size,
    },
    previous: {
      creditGiven: prevCredit,
      collected: prevCollected,
      outstanding: 0, // Not calculated for previous period
      txCount: prevTxCount,
      avgTransactionSize: prevTxCount > 0 ? Math.round(prevCredit / prevTxCount) : 0,
      newCustomers: newCustomersPrevPeriod.size,
    },
    overdueCustomers,
    highestCreditThisPeriod: highestCreditTx ? { amount: highestCreditTx.amount, customerName: nameById.get(highestCreditTx.customerId) || 'Unknown' } : null,
    highestCollectionThisPeriod: highestCollectionTx ? { amount: highestCollectionTx.amount, customerName: nameById.get(highestCollectionTx.customerId) || 'Unknown' } : null,
    collectionRateAllTime,
    totalCreditAllTime,
    totalCollectedAllTime,
    overduePercent,
    allTimeHighestCredit: allTimeHighestCredit ? { amount: allTimeHighestCredit.amount, customerName: nameById.get(allTimeHighestCredit.customerId) || 'Unknown' } : null,
    allTimeHighestCollection: allTimeHighestCollection ? { amount: allTimeHighestCollection.amount, customerName: nameById.get(allTimeHighestCollection.customerId) || 'Unknown' } : null,
    highestOutstanding: highestOutstandingData ? { amount: highestOutstandingData.amount, customerName: nameById.get(highestOutstandingData.customerId) || 'Unknown' } : null,
    mostPayments: null, // Would need more specific tracking
    fullySettledThisMonth: settledThisMonth.size,
    overdueCount,
    dueTodayCount,
    overdueAmount,
  }
}

function getPeriodStart(now: Date, period: Period, weekStartDay: 0 | 1): number {
  if (period === 'today') return startOfDay(now).getTime()
  if (period === 'week') return startOfWeek(now, weekStartDay).getTime()
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

function getPreviousPeriodStart(now: Date, period: Period, weekStartDay: 0 | 1, prevEnd: number): number {
  if (period === 'today') return startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000)).getTime()
  if (period === 'week') return startOfWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), weekStartDay).getTime()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return prevMonth.getTime()
}
