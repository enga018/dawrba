import { formatDate, formatCurrency, formatTime } from './utils'
import { supabase } from './supabase'

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

interface LogActivityParams {
  transactionId?: string
  eventType: LogEntry['event_type']
  amount?: number | null
  previousAmount?: number | null
  note?: string | null
  previousNote?: string | null
  date?: string | null
  previousDate?: string | null
  customerId: string
}

/* Best-effort activity log write (powers the Home "Recent Activity" card
   and the /log pages). Never throws - a logging failure shouldn't block
   the transaction/customer action that triggered it. customer_name is
   NOT a column on transaction_logs (see log/page.tsx, which joins
   customers!inner(name) to get it) - only customer_id is stored here. */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const { error } = await supabase.from('transaction_logs').insert({
      transaction_id: params.transactionId ?? null,
      event_type: params.eventType,
      amount: params.amount ?? null,
      previous_amount: params.previousAmount ?? null,
      note: params.note ?? null,
      previous_note: params.previousNote ?? null,
      date: params.date ?? null,
      previous_date: params.previousDate ?? null,
      customer_id: params.customerId,
    })
    if (error) console.error('logActivity failed:', error)
  } catch (err) {
    console.error('logActivity failed:', err)
  }
}
