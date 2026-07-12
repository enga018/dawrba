'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getInitials, formatCurrency, formatDate, calculateOverdueDays, daysUntilOverdue, type OverdueStrategy } from '@/lib/utils'
import { cacheCustomers, getCachedCustomers } from '@/lib/offline'
import { formatRelativeTime } from '@/lib/utils'
import TransactionModal from '@/app/TransactionModal'

interface Customer {
  id: string
  name: string
  phone?: string
  created_at: string
  balance?: number
  lastTxDate?: string
  transactions: Array<{ amount: number; date?: string; created_at: string }>
}

type FilterType = 'all' | 'active' | 'overdue' | 'due_today' | 'cleared'

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [visibleCount, setVisibleCount] = useState(20)
  const [overdueStrategy, setOverdueStrategy] = useState<OverdueStrategy>('fixed_period')
  const [overdueThresholdDays, setOverdueThresholdDays] = useState(7)
  const [modalTarget, setModalTarget] = useState<{ id: string; name: string; balance: number } | null>(null)
  const [modalMode, setModalMode] = useState<'credit' | 'pay' | null>(null)

  const loadData = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) { setLoading(false); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('overdue_strategy, overdue_threshold_days')
        .eq('id', user.id)
        .single()

      if (profileData?.overdue_strategy) setOverdueStrategy(profileData.overdue_strategy)
      if (profileData?.overdue_threshold_days) setOverdueThresholdDays(profileData.overdue_threshold_days)

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone, opening_balance, created_at')
        .eq('user_id', user.id)

      if (customersError) throw customersError

      const ids = (customersData || []).map((c) => c.id)
      const balances: Record<string, number> = {}
      const lastTx: Record<string, string> = {}
      const txByCustomer: Record<string, Array<{ amount: number; date?: string; created_at: string }>> = {}

      if (ids.length > 0) {
        const { data: txData } = await supabase
          .from('transactions')
          .select('customer_id, amount, date, created_at')
          .in('customer_id', ids)

        for (const t of txData || []) {
          balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)
          if (!lastTx[t.customer_id] || t.created_at > lastTx[t.customer_id]) {
            lastTx[t.customer_id] = t.created_at
          }
          if (!txByCustomer[t.customer_id]) txByCustomer[t.customer_id] = []
          txByCustomer[t.customer_id].push({ amount: t.amount, date: t.date, created_at: t.created_at })
        }
      }

      const withBalance = (customersData || []).map((c) => ({
        ...c,
        balance: (c.opening_balance || 0) + (balances[c.id] || 0),
        lastTxDate: lastTx[c.id] || undefined,
        transactions: txByCustomer[c.id] || [],
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

  const getCustomerStatus = (c: Customer): { label: string; type: 'overdue' | 'due_today' | 'due_soon' | 'active' | 'clear'; overdueDays: number } => {
    const balance = c.balance || 0
    const overdueDays = calculateOverdueDays(balance, c.transactions, overdueStrategy, overdueThresholdDays)
    if (overdueDays > 0) return { label: 'Overdue', type: 'overdue', overdueDays }

    if (balance <= 0) return { label: 'Settled', type: 'clear', overdueDays: 0 }

    // Customer still owes money but hasn't crossed the overdue threshold yet
    const remaining = daysUntilOverdue(balance, c.transactions, overdueStrategy, overdueThresholdDays)
    if (remaining === 0) return { label: 'Due today', type: 'due_today', overdueDays: 0 }
    if (remaining !== null && remaining <= 2) return { label: 'Due soon', type: 'due_soon', overdueDays: 0 }

    return { label: 'Active', type: 'active', overdueDays: 0 }
  }

  const getFilteredSorted = () => {
    let list = [...customers]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
      )
    }

    list = list.filter((c) => {
      if (activeFilter === 'all') return true
      const status = getCustomerStatus(c)
      if (activeFilter === 'active') return status.type === 'active' || status.type === 'due_soon'
      if (activeFilter === 'overdue') return status.type === 'overdue'
      if (activeFilter === 'due_today') return status.type === 'due_today'
      if (activeFilter === 'cleared') return status.type === 'clear'
      return true
    })

    const statusPriority: Record<string, number> = { overdue: 0, due_today: 1, due_soon: 2, active: 3, clear: 4 }
    list.sort((a, b) => {
      const diff = statusPriority[getCustomerStatus(a).type] - statusPriority[getCustomerStatus(b).type]
      if (diff !== 0) return diff
      return (b.balance || 0) - (a.balance || 0)
    })

    return list
  }

  const filteredList = getFilteredSorted()
  const overdueCount = customers.filter((c) => getCustomerStatus(c).type === 'overdue').length
  const dueTodayCount = customers.filter((c) => getCustomerStatus(c).type === 'due_today').length
  const clearedCount = customers.filter((c) => getCustomerStatus(c).type === 'clear').length

  useEffect(() => {
    setVisibleCount(20)
  }, [searchQuery, activeFilter])

  const openModal = (e: React.MouseEvent, customer: Customer, mode: 'credit' | 'pay') => {
    e.preventDefault()
    e.stopPropagation()
    setModalTarget({ id: customer.id, name: customer.name, balance: customer.balance || 0 })
    setModalMode(mode)
  }

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
        <>
          <div className="customer-list">
            {filteredList.slice(0, visibleCount).map((customer) => {
              const status = getCustomerStatus(customer)
              return (
                <Link
                  key={customer.id}
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
                    <button className="btn btn-secondary btn-sm" onClick={(e) => openModal(e, customer, 'credit')}>
                      Add Credit
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={(e) => openModal(e, customer, 'pay')}>
                      Collect
                    </button>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="customer-table-wrap" style={{ display: 'none' }}>
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.slice(0, visibleCount).map((customer) => {
                  const status = getCustomerStatus(customer)
                  return (
                    <tr key={customer.id}>
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
                          <button className="btn btn-secondary btn-sm" onClick={(e) => openModal(e, customer, 'credit')}>
                            Add Credit
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={(e) => openModal(e, customer, 'pay')}>
                            Collect
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredList.length > visibleCount && (
            <button
              className="btn btn-secondary btn-sm btn-block"
              style={{ marginTop: '12px' }}
              onClick={() => setVisibleCount((prev) => prev + 20)}
            >
              See more ({filteredList.length - visibleCount} remaining)
            </button>
          )}
        </>
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