'use client'

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import { supabase } from '@/lib/supabase'
import { getInitials, formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import { calculateCustomerListMetrics } from '@/lib/customerListCalculations'
import { cacheCustomers, getCachedCustomers } from '@/lib/offline'
import TransactionModal from '@/app/TransactionModal'

interface Customer {
  id: string
  name: string
  phone?: string
  created_at: string
  balance?: number
  opening_balance: number
  lastTxDate?: string
  transactions: Array<{ amount: number; date?: string; created_at: string }>
}

type FilterType = 'all' | 'active' | 'overdue' | 'due_today' | 'due_soon' | 'cleared'

function isFilterType(value: string | null): value is FilterType {
  return value === 'all' || value === 'active' || value === 'overdue' || value === 'due_today' || value === 'due_soon' || value === 'cleared'
}

type Status = { label: string; type: 'overdue' | 'due_today' | 'due_soon' | 'active' | 'clear'; overdueDays: number }
type OpenModal = (e: React.MouseEvent, customer: Customer, mode: 'credit' | 'pay') => void

const CustomerCard = memo(function CustomerCard({ customer, status, onOpenModal }: { customer: Customer; status: Status; onOpenModal: OpenModal }) {
  return (
    <Link
      href={`/customers/${customer.id}`}
      className="customer-card"
      style={{ textDecoration: 'none' }}
    >
      <div className="cc-top">
        <div className="cc-left">
          <div className={`avatar ${status.type}`}>{getInitials(customer.name)}</div>
          <div className="cc-identity">
            <div className="cc-name-row">
              <span className="cc-name">{customer.name}</span>
            </div>
            <div className="cc-phone">{customer.phone || 'No phone'}</div>
          </div>
        </div>
        <span className={`status-badge ${status.type}`}>{status.label}</span>
      </div>

      <div className="cc-amount-row">
        <span className={`cc-balance ${(customer.balance || 0) <= 0 ? 'zero' : ''}`}>
          {(customer.balance || 0) <= 0
            ? '₹0'
            : '₹' + formatCurrency(customer.balance || 0)}
        </span>
        <span className={`cc-status-text ${status.type}`}>
          {status.type === 'overdue' && `${status.overdueDays} day${status.overdueDays === 1 ? '' : 's'} overdue`}
          {status.type !== 'overdue' && (customer.lastTxDate ? `Last: ${formatRelativeTime(customer.lastTxDate)}` : 'No transactions')}
        </span>
      </div>

      <div className="cc-actions">
        <button className="btn btn-secondary btn-sm" onClick={(e) => onOpenModal(e, customer, 'credit')}>
          Add Credit
        </button>
        <button className="btn btn-primary btn-sm" onClick={(e) => onOpenModal(e, customer, 'pay')}>
          Collect
        </button>
      </div>
    </Link>
  )
})

const CustomerTableRow = memo(function CustomerTableRow({ customer, status, onOpenModal }: { customer: Customer; status: Status; onOpenModal: OpenModal }) {
  return (
    <tr>
      <td>
        <Link href={`/customers/${customer.id}`} className="ct-name-cell" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className={`avatar ${status.type}`}>{getInitials(customer.name)}</div>
          <span className="cc-name">{customer.name}</span>
        </Link>
      </td>
      <td>{customer.phone || '—'}</td>
      <td className="ct-balance">
        {(customer.balance || 0) <= 0
          ? '₹0'
          : '₹' + formatCurrency(customer.balance || 0)}
      </td>
      <td>
        <span className={`status-badge ${status.type}`}>{status.label}</span>
      </td>
      <td>
        <div className="ct-actions">
          <button className="btn btn-secondary btn-sm" onClick={(e) => onOpenModal(e, customer, 'credit')}>
            Add Credit
          </button>
          <button className="btn btn-primary btn-sm" onClick={(e) => onOpenModal(e, customer, 'pay')}>
            Collect
          </button>
        </div>
      </td>
    </tr>
  )
})

export default function CustomerList() {
  const searchParams = useSearchParams()
  const initialFilter = searchParams.get('filter')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>(isFilterType(initialFilter) ? initialFilter : 'all')
  const [visibleCount, setVisibleCount] = useState(20)
  const [overdueThresholdDays, setOverdueThresholdDays] = useState(7)
  const [overdueResetThresholdPct, setOverdueResetThresholdPct] = useState(50)
  const [modalTarget, setModalTarget] = useState<{ id: string; name: string; balance: number } | null>(null)
  const [modalMode, setModalMode] = useState<'credit' | 'pay' | null>(null)

  const loadData = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) { setLoading(false); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('overdue_threshold_days, overdue_reset_threshold_pct')
        .eq('id', user.id)
        .single()

      if (profileData?.overdue_threshold_days) setOverdueThresholdDays(profileData.overdue_threshold_days)
      if (profileData?.overdue_reset_threshold_pct) setOverdueResetThresholdPct(profileData.overdue_reset_threshold_pct)

      // Use server-side summary API for faster balance calculations
      const response = await fetch(`/api/customers/summary?user_id=${user.id}&pageSize=10000`)
      if (!response.ok) throw new Error('Failed to fetch summaries')
      const { data: summaries } = await response.json()

      const withBalance = (summaries || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        created_at: s.created_at,
        balance: s.balance,
        lastTxDate: s.lastTxDate || undefined,
        transactions: [],
      }))

      setCustomers(withBalance)
      cacheCustomers(withBalance)
    } catch {
      const cached = await getCachedCustomers<Customer>()
      if (cached && cached.length > 0) setCustomers(cached)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const handleOnline = () => loadData()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [loadData])

  const { statusByCustomerId, overdueCount: calculatedOverdueCount, dueTodayCount: calculatedDueTodayCount, clearedCount } = useMemo(() => {
    return calculateCustomerListMetrics(customers, overdueThresholdDays, overdueResetThresholdPct)
  }, [customers, overdueThresholdDays, overdueResetThresholdPct])

  const getCustomerStatus = (c: Customer): Status => statusByCustomerId.get(c.id)!

  const filteredList = useMemo(() => {
    let list = [...customers]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
      )
    }

    list = list.filter((c) => {
      if (activeFilter === 'all') return true
      const status = statusByCustomerId.get(c.id)!
      if (activeFilter === 'active') return status.type === 'active' || status.type === 'due_soon'
      if (activeFilter === 'overdue') return status.type === 'overdue'
      if (activeFilter === 'due_today') return status.type === 'due_today'
      if (activeFilter === 'due_soon') return status.type === 'due_soon'
      if (activeFilter === 'cleared') return status.type === 'clear'
      return true
    })

    const statusPriority: Record<string, number> = { overdue: 0, due_today: 1, due_soon: 2, active: 3, clear: 4 }
    list.sort((a, b) => {
      const diff = statusPriority[statusByCustomerId.get(a.id)!.type] - statusPriority[statusByCustomerId.get(b.id)!.type]
      if (diff !== 0) return diff
      return (b.balance || 0) - (a.balance || 0)
    })

    return list
  }, [customers, searchQuery, activeFilter, statusByCustomerId])


  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: filteredList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 160, // Approximate height of customer card
    overscan: 5, // Render 5 extra items above/below visible area
  })

  const openModal: OpenModal = useCallback((e, customer, mode) => {
    e.preventDefault()
    e.stopPropagation()
    setModalTarget({ id: customer.id, name: customer.name, balance: customer.balance || 0 })
    setModalMode(mode)
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="empty">
        <i className="fa-solid fa-users-slash"></i>
        <p>No customers yet.</p>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="customer-page-header">
        <h2>Customers</h2>
        <span className="customer-count-badge">{customers.length} customers</span>
      </div>

      {/* Search + Filter */}
      <div className="customer-toolbar">
        <div className="search-wrap">
          <i className="fa-solid fa-search"></i>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="filter-chips">
        <button className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>
          All
        </button>
        <button className={`filter-chip filter-chip-active-status ${activeFilter === 'active' ? 'active' : ''}`} onClick={() => setActiveFilter('active')}>
          Active
        </button>
        <button className={`filter-chip filter-chip-overdue ${activeFilter === 'overdue' ? 'active' : ''}`} onClick={() => setActiveFilter('overdue')}>
          Overdue
        </button>
        <button className={`filter-chip filter-chip-due ${activeFilter === 'due_today' ? 'active' : ''}`} onClick={() => setActiveFilter('due_today')}>
          Due Today
        </button>
        <button className={`filter-chip filter-chip-due ${activeFilter === 'due_soon' ? 'active' : ''}`} onClick={() => setActiveFilter('due_soon')}>
          Due Soon
        </button>
        <button className={`filter-chip filter-chip-cleared ${activeFilter === 'cleared' ? 'active' : ''}`} onClick={() => setActiveFilter('cleared')}>
          Settled
        </button>
      </div>

      {/* List */}
      {filteredList.length === 0 ? (
        <div className="empty">
          <p>No customers match your search.</p>
        </div>
      ) : (
        <div
          ref={parentRef}
          className="customer-list"
          style={{ height: 'calc(100vh - 400px)', overflow: 'auto' }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const customer = filteredList[virtualItem.index]
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <CustomerCard customer={customer} status={getCustomerStatus(customer)} onOpenModal={openModal} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <TransactionModal
        show={modalMode !== null}
        mode={modalMode === 'pay' ? 'pay' : 'credit'}
        customerId={modalTarget?.id}
        customerName={modalTarget?.name}
        currentBalance={modalTarget?.balance}
        onClose={() => { setModalMode(null); setModalTarget(null) }}
        onSaved={loadData}
      />
    </>
  )
}