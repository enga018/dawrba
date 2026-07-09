import { formatDate, formatCurrency, formatTime } from './utils'

export interface LogEntry {
  id: string
  transaction_id: string
  event_type: 'insert' | 'update' | 'delete' | 'opening_balance' | 'opening_balance_update'
  amount: number | null
  note?: string
  date?: string
  previous_amount: number | null
  previous_note?: string
  previous_date?: string
  created_at: string
  customer_id?: string
  customer_name?: string
}

export function formatLogEntry(entry: LogEntry, withCustomerName = false): string {
  const dateStr = formatDate(entry.date || entry.created_at)
  const timeStr = formatTime(entry.created_at)
  const prefix = withCustomerName && entry.customer_name ? `${entry.customer_name} — ` : ''

  if (entry.event_type === 'opening_balance') {
    return `${prefix}Opening balance of ₹${formatCurrency(Math.abs(entry.amount || 0))} set on ${dateStr}, ${timeStr}`
  }

  if (entry.event_type === 'opening_balance_update') {
    return `${prefix}Opening balance was edited from ₹${formatCurrency(Math.abs(entry.previous_amount || 0))} to ₹${formatCurrency(Math.abs(entry.amount || 0))} on ${dateStr} at ${timeStr}`
  }

  if (entry.event_type === 'insert') {
    const isCredit = (entry.amount || 0) > 0
    const label = isCredit ? 'Credit given' : 'Payment received'
    return `${prefix}${label} on ${dateStr}, ${timeStr} · ₹${formatCurrency(Math.abs(entry.amount || 0))}`
  }

  if (entry.event_type === 'update') {
    const wasCredit = (entry.previous_amount || 0) > 0
    const label = wasCredit ? 'Credit given' : 'Payment received'
    return `${prefix}${label} on ${dateStr} was edited from ₹${formatCurrency(Math.abs(entry.previous_amount || 0))} to ₹${formatCurrency(Math.abs(entry.amount || 0))} at ${timeStr}`
  }

  const wasCredit = (entry.previous_amount || 0) > 0
  const label = wasCredit ? 'Credit given' : 'Payment received'
  return `${prefix}${label} on ${dateStr} was deleted (₹${formatCurrency(Math.abs(entry.previous_amount || 0))}) at ${timeStr}`
}
