'use client'

import { memo } from 'react'
import Link from 'next/link'
import { formatCurrency, getInitials } from '@/lib/utils'
import type { DashboardMetrics } from '@/lib/dashboardCalculations'

interface Props {
  metrics: DashboardMetrics
}

interface AttentionCustomer {
  id: string
  name: string
  phone?: string
  balance: number
}

const AttentionItem = memo(function AttentionItem({ c }: { c: AttentionCustomer }) {
  return (
    <Link href={`/customers/${c.id}`} className="attention-item">
      <div className="attention-left">
        <div className="avatar-sm">{getInitials(c.name)}</div>
        <div>
          <div className="attention-name">{c.name}</div>
          <div className="attention-meta">{c.phone || 'No phone'}</div>
        </div>
      </div>
      <div className="attention-amount">₹{formatCurrency(c.balance)}</div>
    </Link>
  )
})

export default function NeedsAttention({ metrics }: Props) {
  const attentionList = metrics.overdueCustomers

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
            <AttentionItem key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  )
}
