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

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-IN')
}

export function percentTrend(today: number, yesterday: number): number | undefined {
  if (yesterday === 0) return undefined
  return Math.round(((today - yesterday) / yesterday) * 100)
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

export type OverdueStrategy = 'oldest_credit' | 'fixed_period'

interface Transaction {
  amount: number
  date?: string
  created_at: string
}

export function calculateOverdueDays(
  balance: number,
  transactions: Transaction[],
  strategy: OverdueStrategy = 'oldest_credit',
  thresholdDays: number = 7
): number {
  if (balance <= 0) return 0

  if (strategy === 'fixed_period') {
    const lastTx = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date || a.created_at).getTime()
      const dateB = new Date(b.date || b.created_at).getTime()
      return dateB - dateA
    })[0]
    if (!lastTx) return 0
    const lastDate = lastTx.date || lastTx.created_at
    const days = daysSince(lastDate)
    return days > thresholdDays ? days - thresholdDays : 0
  }

  const credits = transactions.filter((t) => t.amount > 0)
  if (credits.length === 0) return 0
  const oldest = credits.reduce((min, t) => {
    const d = new Date(t.date || t.created_at).getTime()
    return d < min ? d : min
  }, Infinity)
  const days = daysSince(new Date(oldest).toISOString())
  return days > thresholdDays ? days - thresholdDays : 0
}

export function isCustomerOverdue(
  balance: number,
  transactions: Transaction[],
  strategy: OverdueStrategy = 'oldest_credit',
  thresholdDays: number = 7
): boolean {
  return calculateOverdueDays(balance, transactions, strategy, thresholdDays) > 0
}
