import { calculateOverdueDays, daysUntilOverdue } from './utils'

export interface CustomerWithBalance {
  id: string
  name: string
  phone?: string
  opening_balance: number
  created_at: string
  balance?: number
  lastTxDate?: string
  transactions: Array<{ amount: number; date?: string; created_at: string }>
}

export type CustomerStatus = 'overdue' | 'due_today' | 'due_soon' | 'active' | 'clear'

export interface CustomerStatusInfo {
  label: string
  type: CustomerStatus
  overdueDays: number
}

export interface CustomerListMetrics {
  statusByCustomerId: Map<string, CustomerStatusInfo>
  overdueCount: number
  dueTodayCount: number
  clearedCount: number
}

export function calculateCustomerListMetrics(
  customers: CustomerWithBalance[],
  overdueThresholdDays: number,
  overdueResetThresholdPct: number
): CustomerListMetrics {
  const statusByCustomerId = new Map<string, CustomerStatusInfo>()
  let overdueCount = 0
  let dueTodayCount = 0
  let clearedCount = 0

  for (const c of customers) {
    const balance = c.balance || 0
    const overdueDays = calculateOverdueDays(balance, c.transactions, overdueThresholdDays, overdueResetThresholdPct)

    let status: CustomerStatusInfo

    if (overdueDays > 0) {
      status = { label: 'Overdue', type: 'overdue', overdueDays }
      overdueCount++
    } else if (balance <= 0) {
      status = { label: 'Settled', type: 'clear', overdueDays: 0 }
      clearedCount++
    } else {
      // Customer still owes money but hasn't crossed the overdue threshold yet
      const remaining = daysUntilOverdue(balance, c.transactions, overdueThresholdDays, overdueResetThresholdPct)
      if (remaining === 0) {
        status = { label: 'Due today', type: 'due_today', overdueDays: 0 }
        dueTodayCount++
      } else if (remaining !== null && remaining <= 3) {
        status = { label: 'Due soon', type: 'due_soon', overdueDays: 0 }
      } else {
        status = { label: 'Active', type: 'active', overdueDays: 0 }
      }
    }

    statusByCustomerId.set(c.id, status)
  }

  return {
    statusByCustomerId,
    overdueCount,
    dueTodayCount,
    clearedCount,
  }
}
