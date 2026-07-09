'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getInitials, formatCurrency, formatRelativeTime } from '@/lib/utils'
import { cacheCustomers, getCachedCustomers } from '@/lib/offline'
import { showToast } from '@/lib/toast'
import DashboardSummary from './DashboardSummary'

interface Customer {
  id: string
  name: string
  phone?: string
  created_at: string
  balance?: number
}

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortValue, setSortValue] = useState('name-asc')
  const [offline, setOffline] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'credit' | 'add-customer'>('credit')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newOpeningBalance, setNewOpeningBalance] = useState('')

  const loadData = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        setLoading(false)
        return
      }

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone, opening_balance, created_at')
        .eq('user_id', user.id)

      if (customersError) throw customersError

      const ids = (customersData || []).map((c) => c.id)
      const balances: Record<string, number> = {}

      if (ids.length > 0) {
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('customer_id, amount')
          .in('customer_id', ids)

        if (txError) throw txError

        for (const t of txData || []) {
          balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)
        }
      }

      const withBalance = (customersData || []).map((c) => ({
        ...c,
        balance: (c.opening_balance || 0) + (balances[c.id] || 0),
      }))

      setCustomers(withBalance)
      cacheCustomers(withBalance)
    } catch {
      const cached = getCachedCustomers<Customer>()
      if (cached && cached.length > 0) {
        setCustomers(cached)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setOffline(!navigator.onLine)
    const handleOffline = () => setOffline(true)
    const handleOnline = () => setOffline(false)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handleOnline = () => loadData()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [loadData])

  const getFilteredSorted = () => {
    let list = [...customers]

    if (searchQuery) {
      list = list.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    switch (sortValue) {
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        list.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'balance-desc':
        list.sort((a, b) => (b.balance || 0) - (a.balance || 0))
        break
      case 'balance-asc':
        list.sort((a, b) => (a.balance || 0) - (b.balance || 0))
        break
      case 'newest':
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
    }

    return list
  }

  const filteredList = getFilteredSorted()

  const closeModal = () => {
    setShowModal(false)
    setModalMode('credit')
    setSelectedCustomerId('')
    setAmount('')
    setNewName('')
    setNewPhone('')
    setNewOpeningBalance('')
  }

  return (
    <>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div className="toolbar">
          <div className="search-wrap">
            <i className="fa-solid fa-search"></i>
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sort-wrap">
            <select value={sortValue} onChange={(e) => setSortValue(e.target.value)}>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="balance-desc">Balance (High-Low)</option>
              <option value="balance-asc">Balance (Low-High)</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="empty">
          <i className="fa-solid fa-users-slash"></i>
          <p>
            {searchQuery
              ? 'No customers match your search.'
              : 'No customers yet.'}
          </p>
        </div>
      ) : (
        <>
          <DashboardSummary />

          <div className="customer-list">
            {filteredList.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="customer-card"
                style={{ textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div className="avatar">{getInitials(customer.name)}</div>
                  <div>
                    <div className="cc-name">{customer.name}</div>
                    <div className="cc-meta">
                      {customer.phone || (customer.created_at ? formatRelativeTime(customer.created_at) : '')}
                      {customer.phone && customer.created_at ? ` · ${formatRelativeTime(customer.created_at)}` : ''}
                    </div>
                  </div>
                </div>
                <div className={`cc-balance ${(customer.balance || 0) <= 0 ? 'zero' : ''}`}>
                  {(customer.balance || 0) <= 0
                    ? '₹0'
                    : '₹' + formatCurrency(customer.balance || 0)}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <button
        className="add-btn"
        title={offline ? 'Unavailable offline' : 'Add credit or customer'}
        disabled={offline}
        onClick={() => {
          setShowModal(true)
          setModalMode('credit')
        }}
        style={{ opacity: offline ? 0.5 : 1, cursor: offline ? 'not-allowed' : 'pointer' }}
      >
        <i className="fa-solid fa-plus"></i>
      </button>

      {showModal && (
        <div className="modal-backdrop active">
          <div className="modal-sheet">
            <div className="modal-head">
              <h3>{modalMode === 'credit' ? 'Add Credit' : 'Add Customer'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            {modalMode === 'credit' ? (
              <div>
                <div className="field">
                  <label>Select Customer</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">Choose a customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary btn-block"
                  disabled={!selectedCustomerId || !amount || submitting}
                  onClick={async () => {
                    const value = parseFloat(amount)
                    if (!selectedCustomerId || !value) return

                    setSubmitting(true)
                    try {
                      const { error } = await supabase.from('transactions').insert({
                        customer_id: selectedCustomerId,
                        amount: value,
                      })
                      if (error) throw error

                      showToast('Credit added')
                      closeModal()
                      loadData()
                    } catch {
                      showToast('Failed to add credit', 'error')
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                >
                  {submitting ? <span className="spinner"></span> : 'Add Credit'}
                </button>
                <button
                  className="btn btn-secondary btn-block"
                  style={{ marginTop: '10px' }}
                  onClick={() => setModalMode('add-customer')}
                >
                  Add New Customer Instead
                </button>
              </div>
            ) : (
              <div>
                <div className="field">
                  <label>Name</label>
                  <input
                    type="text"
                    placeholder="Customer name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Phone (optional)</label>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Opening Balance (optional)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newOpeningBalance}
                    onChange={(e) => setNewOpeningBalance(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary btn-block"
                  disabled={!newName.trim() || submitting}
                  onClick={async () => {
                    if (!newName.trim()) return

                    setSubmitting(true)
                    try {
                      const user = (await supabase.auth.getUser()).data.user
                      if (!user) throw new Error('Not authenticated')

                      const { error } = await supabase.from('customers').insert({
                        user_id: user.id,
                        name: newName.trim(),
                        phone: newPhone.trim() || null,
                        opening_balance: parseFloat(newOpeningBalance) || 0,
                      })
                      if (error) throw error

                      showToast('Customer added')
                      closeModal()
                      loadData()
                    } catch {
                      showToast('Failed to add customer', 'error')
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                >
                  {submitting ? <span className="spinner"></span> : 'Add Customer'}
                </button>
                <button
                  className="btn btn-secondary btn-block"
                  style={{ marginTop: '10px' }}
                  onClick={() => setModalMode('credit')}
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  )
}