export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTimestampDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function startOfWeek(d: Date, weekStartsOn: 0 | 1 = 0): Date {
  const s = startOfDay(d)
  const diff = (s.getDay() - weekStartsOn + 7) % 7
  s.setDate(s.getDate() - diff)
  return s
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-IN')
}

export function percentTrend(today: number, yesterday: number): number | undefined {
  if (yesterday === 0) return undefined
  return Math.round(((today - yesterday) / yesterday) * 100)
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo ago`
  return `${Math.floor(diffMonths / 12)}y ago`
}

export function daysSince(dateStr: string): number {
  const then = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

interface Transaction {
  amount: number
  date?: string
  created_at: string
}

// Cache for sorted transactions by customer to avoid redundant sorting
const sortedTransactionCache = new WeakMap<any, any>()

/* Days since the customer's balance most recently went from settled (<= 0)
   to owing (> 0), or since their last "meaningful" payment - the start of
   the current unpaid streak. This is NOT just "days since the last
   transaction": taking on more credit while already owing money never
   resets the clock (the debt has been aging the whole time), but paying
   off in full, or paying down at least resetThresholdPct of the current
   balance, correctly starts a fresh clock. A token payment (below the
   threshold) doesn't reset it. Null if there's no active streak (already
   settled, or no transactions to anchor to). */
function daysSinceStreakStart(
  balance: number,
  transactions: Transaction[],
  resetThresholdPct: number = 50
): number | null {
  if (balance <= 0) return null
  if (!transactions || transactions.length === 0) return null

  let sorted: Transaction[]

  // Use pre-sorted transactions if already sorted (marked by _sorted property)
  if ((transactions as any)._sorted) {
    sorted = transactions
  } else {
    sorted = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date || a.created_at).getTime()
      const dateB = new Date(b.date || b.created_at).getTime()
      return dateA - dateB
    })
  }

  const totalTxAmount = sorted.reduce((sum, t) => sum + (t.amount || 0), 0)
  let runningBalance = balance - totalTxAmount
  let streakStart: string | null = null

  for (const t of sorted) {
    const prevBalance = runningBalance
    const amount = t.amount || 0
    runningBalance += amount
    if (runningBalance <= 0) {
      streakStart = null
    } else if (prevBalance <= 0) {
      streakStart = t.date || t.created_at
    } else if (amount < 0) {
      const ratio = Math.abs(amount) / prevBalance
      if (ratio >= resetThresholdPct / 100) {
        streakStart = t.date || t.created_at
      }
    }
  }

  return streakStart ? daysSince(streakStart) : null
}

export function calculateOverdueDays(
  balance: number,
  transactions: Transaction[],
  thresholdDays: number = 7,
  resetThresholdPct: number = 50
): number {
  if (balance <= 0) return 0
  const days = daysSinceStreakStart(balance, transactions, resetThresholdPct)
  if (days === null) return 0
  return days > thresholdDays ? days - thresholdDays : 0
}

export function isCustomerOverdue(
  balance: number,
  transactions: Transaction[],
  thresholdDays: number = 7,
  resetThresholdPct: number = 50
): boolean {
  return calculateOverdueDays(balance, transactions, thresholdDays, resetThresholdPct) > 0
}

/* Days of grace period left before a customer becomes overdue (0 = last day
   before overdue, i.e. "due today"). Null if there's no balance owed or no
   reference transaction to count from. */
export function daysUntilOverdue(
  balance: number,
  transactions: Transaction[],
  thresholdDays: number = 7,
  resetThresholdPct: number = 50
): number | null {
  if (balance <= 0) return null
  const days = daysSinceStreakStart(balance, transactions, resetThresholdPct)
  if (days === null) return null
  const remaining = thresholdDays - days
  return remaining >= 0 ? remaining : null
}
