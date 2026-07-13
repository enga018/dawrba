'use client'

import Link from 'next/link'
import { formatCurrency, getInitials, isCustomerOverdue } from '@/lib/utils'
import type { DashboardCustomer, DashboardTx, DashboardThresholds } from './DashboardPage'

interface Props {
  customers: DashboardCustomer[]
  transactions: DashboardTx[]
  thresholds: DashboardThresholds
}

export default function NeedsAttention({ customers, transactions, thresholds }: Props) {
  const balances: Record<string, number> = {}
  const txByCustomer: Record<string, Array<{ amount: number; date?: string; created_at: string }>> = {}
  for (const t of transactions) {
    balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)
    if (!txByCustomer[t.customer_id]) txByCustomer[t.customer_id] = []
    txByCustomer[t.customer_id].push({ amount: t.amount, date: t.date, created_at: t.created_at })
  }

  const attentionList = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance: (c.opening_balance || 0) + (balances[c.id] || 0),
      customerTx: txByCustomer[c.id] || [],
    }))
    .filter((c) => isCustomerOverdue(c.balance, c.customerTx, thresholds.thresholdDays, thresholds.resetThresholdPct))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 3)
    .map(({ customerTx, ...rest }) => rest)

  return (
    <div className="home-section-card">
      <div className="home-section-header">
        <h3>Needs Attention</h3>
      </div>

      {attentionList.length === 0 ? (
        <div className="empty" style={{ padding: '20px' }}>
          <i className="fa-solid fa-check-circle" style={{ color: 'var(--green)' }}></i>
          <p>All clear! No overdue customers.</p>
        </div>
      ) : (
        <div className="attention-list">
          {attentionList.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="attention-item"
            >
              <div className="attention-left">
                <div className="avatar-sm">{getInitials(c.name)}</div>
                <div>
                  <div className="attention-name">{c.name}</div>
                  <div className="attention-meta">{c.phone || 'No phone'}</div>
                </div>
              </div>
              <div className="attention-amount">₹{formatCurrency(c.balance)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
