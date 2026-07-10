'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { cacheCustomers, getCachedCustomers } from '@/lib/offline'
import { showToast } from '@/lib/toast'
import DashboardHero from './DashboardHero'
import DashboardSummary from './DashboardSummary'
import RecentTransactions from './RecentTransactions'
import CustomerList from './CustomerList'
import AmountKeypad from './AmountKeypad'

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
  const [offline, setOffline] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'credit' | 'pay' | 'add-customer'>('credit')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newOpeningBalance, setNewOpeningBalance] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

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
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty">
          <i className="fa-solid fa-users-slash"></i>
          <p>No customers yet.</p>
        </div>
      ) : (
        <>
          <DashboardSummary />

          <DashboardHero />

          <div className="dashboard-columns">
            <div className="dashboard-customers">
              <CustomerList key={refreshKey} />
            </div>

            <RecentTransactions limit={5} />
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
              <h3>{modalMode === 'pay' ? 'Collect Payment' : modalMode === 'credit' ? 'Add Credit' : 'Add Customer'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            {modalMode === 'credit' || modalMode === 'pay' ? (
              <div>
                <div className="segmented">
                  <button
                    type="button"
                    className={`segmented-btn ${modalMode === 'credit' ? 'active' : ''}`}
                    onClick={() => setModalMode('credit')}
                  >
                    Give Credit
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${modalMode === 'pay' ? 'active' : ''}`}
                    onClick={() => setModalMode('pay')}
                  >
                    Collect Payment
                  </button>
                </div>

                <div className="amount-entry">
                  <div className="amount-display">
                    ₹{amount ? Number(amount).toLocaleString('en-IN') : '0'}
                  </div>
                  <div className="amount-target">
                    <span className="amount-target-label">
                      {modalMode === 'pay' ? 'Collecting from' : 'Adding credit to'}
                    </span>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                      <option value="">Select customer...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <AmountKeypad value={amount} onChange={setAmount} />

                <button
                  className="btn btn-primary btn-block"
                  disabled={!selectedCustomerId || !amount || submitting}
                  onClick={async () => {
                    const value = parseFloat(amount)
                    if (!selectedCustomerId || !value) return

                    const signed = modalMode === 'pay' ? -value : value
                    setSubmitting(true)
                    try {
                      const { error } = await supabase.from('transactions').insert({
                        customer_id: selectedCustomerId,
                        amount: signed,
                      })
                      if (error) throw error

                      showToast(modalMode === 'pay' ? 'Payment recorded' : 'Credit added')
                      closeModal()
                      loadData()
                      setRefreshKey((k) => k + 1)
                    } catch {
                      showToast(modalMode === 'pay' ? 'Failed to record payment' : 'Failed to add credit', 'error')
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                >
                  {submitting ? <span className="spinner"></span> : modalMode === 'pay' ? 'Collect Payment' : 'Add Credit'}
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
                      setRefreshKey((k) => k + 1)
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