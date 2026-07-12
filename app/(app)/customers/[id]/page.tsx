'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatDate, formatTime, formatCurrency, getInitials, calculateOverdueDays, type OverdueStrategy } from '@/lib/utils'
import { cacheTransactions, getCachedTransactions, offlineWrite } from '@/lib/offline'
import { showToast } from '@/lib/toast'
import { logActivity, formatLogEntry, type LogEntry } from '@/lib/transactionLog'
import TransactionModal from '@/app/TransactionModal'

interface Customer {
  id: string
  name: string
  phone?: string
  opening_balance: number
  balance: number
  created_at?: string
}

interface Transaction {
  id: string
  amount: number
  note?: string
  date?: string
  created_at: string
  updated_at?: string
}

type TxFilter = 'all' | 'credit' | 'payment'

function CustomerDetailInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [visibleCount, setVisibleCount] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeModal, setActiveModal] = useState<'credit' | 'pay' | null>(null)
  const [offline, setOffline] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [txFilter, setTxFilter] = useState<TxFilter>('all')
  const [deleteCustomerConfirm, setDeleteCustomerConfirm] = useState(false)
  const [deletingCustomer, setDeletingCustomer] = useState(false)
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editOpeningBalance, setEditOpeningBalance] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [overdueStrategy, setOverdueStrategy] = useState<OverdueStrategy>('fixed_period')
  const [overdueThresholdDays, setOverdueThresholdDays] = useState(7)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [logLoading, setLogLoading] = useState(true)

  const LOG_PAGE_SIZE = 5

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
    if (searchParams.get('addCredit') === '1') {
      setActiveModal('credit')
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('overdue_strategy, overdue_threshold_days')
        .eq('id', user.id)
        .single()

      if (profileData?.overdue_strategy) setOverdueStrategy(profileData.overdue_strategy)
      if (profileData?.overdue_threshold_days) setOverdueThresholdDays(profileData.overdue_threshold_days)

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, phone, opening_balance, created_at')
        .eq('id', customerId)
        .eq('user_id', user.id)
        .single()

      if (customerError) throw customerError

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (txError) throw txError

      const ob = customerData.opening_balance || 0
      const txSum = (txData || []).reduce((sum, t) => sum + (t.amount || 0), 0)
      setCustomer({ ...customerData, opening_balance: ob, balance: ob + txSum })
      setTransactions(txData || [])
      cacheTransactions(customerId, txData || [])
    } catch (err) {
      const cached = await getCachedTransactions<Transaction>(customerId)
      if (cached && cached.length > 0) {
        const balance = cached.reduce((sum, t) => sum + (t.amount || 0), 0)
        setCustomer({ id: customerId, name: 'Cached Customer', opening_balance: 0, balance } as Customer)
        setTransactions(cached)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load customer')
      }
    } finally {
      setLoading(false)
    }
  }, [customerId, router])

  const loadLogPage = useCallback(async (offset: number) => {
    const { data, error } = await supabase
      .from('transaction_logs')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + LOG_PAGE_SIZE - 1)
    if (error || !data) return []
    return data as LogEntry[]
  }, [customerId])

  useEffect(() => {
    const load = async () => {
      const page = await loadLogPage(0)
      setLogEntries(page)
      setLogLoading(false)
    }
    load()
  }, [loadLogPage])

  useEffect(() => {
    const onRefresh = () => { loadData(); loadLogPage(0).then(setLogEntries) }
    window.addEventListener('dawrba:refresh', onRefresh)
    return () => window.removeEventListener('dawrba:refresh', onRefresh)
  }, [loadData, loadLogPage])

  useEffect(() => {
    const handleOnline = () => loadData()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [loadData])

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setActiveModal(tx.amount > 0 ? 'credit' : 'pay')
  }

  const handleDelete = async (txId: string) => {
    const deletedTx = transactions.find((t) => t.id === txId)
    setDeleting(true)
    try {
      const result = await offlineWrite(
        async () => {
          const { error } = await supabase.from('transactions').delete().eq('id', txId)
          if (error) throw error
          if (deletedTx && customer) {
            logActivity({
              transactionId: txId,
              eventType: 'delete',
              previousAmount: deletedTx.amount,
              previousNote: deletedTx.note || null,
              customerId: customer.id,
            })
          }
          return { data: null, error: null }
        },
        { table: 'transactions', operation: 'delete', data: {}, filters: { id: txId } }
      )
      if (result?.error) throw result.error
      setDeleteConfirm(null)
      showToast('Transaction deleted')
      await loadData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete transaction'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const openAddModal = (mode: 'credit' | 'pay') => {
    setEditingTx(null)
    setActiveModal(mode)
  }

  const handleDeleteCustomer = async () => {
    setDeletingCustomer(true)
    try {
      const result = await offlineWrite(
        async () => {
          await supabase.from('transactions').delete().eq('customer_id', customerId)
          const { error } = await supabase.from('customers').delete().eq('id', customerId)
          if (error) throw error
          return { data: null, error: null }
        },
        { table: 'customers', operation: 'delete', data: {}, filters: { id: customerId } }
      )
      if (result?.error) throw result.error
      showToast('Customer deleted')
      router.push('/customers')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete customer', 'error')
    } finally {
      setDeletingCustomer(false)
      setDeleteCustomerConfirm(false)
    }
  }

  const handleSaveCustomer = async () => {
    if (!editName.trim()) return
    setSavingCustomer(true)
    try {
      const ob = parseFloat(editOpeningBalance) || 0
      const prevOb = customer ? customer.opening_balance : 0
      const updateData: Record<string, unknown> = { name: editName.trim(), phone: editPhone.trim() || null }
      if (ob !== prevOb) updateData.opening_balance = ob
      const result = await offlineWrite(
        async () => {
          const { error } = await supabase.from('customers').update(updateData).eq('id', customerId)
          if (error) throw error
          if (ob !== prevOb && customer) {
            logActivity({
              eventType: 'opening_balance_update',
              amount: ob,
              previousAmount: prevOb,
              customerId: customer.id,
            })
          }
          return { data: null, error: null }
        },
        { table: 'customers', operation: 'update', data: updateData, filters: { id: customerId } }
      )
      if (result?.error) throw result.error
      showToast('Customer updated')
      setShowEditCustomerModal(false)
      await loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update customer', 'error')
    } finally {
      setSavingCustomer(false)
    }
  }

  const openEditCustomer = () => {
    if (!customer) return
    setEditName(customer.name)
    setEditPhone(customer.phone || '')
    setEditOpeningBalance(String(customer.opening_balance))
    setShowEditCustomerModal(true)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  if (!customer) {
    return <div className="auth-error" style={{ display: 'block' }}>Customer not found</div>
  }

  const totalCredit = customer.opening_balance + transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalPaid = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const lastPaymentTx = transactions.find((t) => t.amount < 0)
  const lastPayment = lastPaymentTx ? Math.abs(lastPaymentTx.amount) : 0

  const overdueDays = calculateOverdueDays(
    customer.balance,
    transactions,
    overdueStrategy,
    overdueThresholdDays
  )

  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === 'credit') return tx.amount > 0
    if (txFilter === 'payment') return tx.amount < 0
    return true
  })

  return (
    <>
      {/* Customer Header Card */}
      <div className="customer-header-card">
        <div className="customer-header-top">
          <div className="customer-header-avatar">{getInitials(customer.name)}</div>
          <div className="customer-header-info">
            <h2 className="customer-header-name">{customer.name}</h2>
            <div className="customer-header-phone">
              {customer.phone || 'No phone'}
            </div>
          </div>
        </div>
        <div className={`overdue-badge ${overdueDays > 0 ? 'overdue' : 'clear'}`}>
          {overdueDays > 0 ? `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue` : 'All clear'}
        </div>
      </div>

      {/* Balance Stats */}
      <div className="balance-stats">
        <div className="balance-stat">
          <div className="balance-stat-body">
            <span className="balance-stat-label">Current Balance</span>
            <span className={`balance-stat-value ${customer.balance <= 0 ? 'green' : 'red'}`}>
              ₹{formatCurrency(customer.balance)}
            </span>
          </div>
        </div>
        <div className="balance-stat">
          <div className="balance-stat-body">
            <span className="balance-stat-label">Total Credit</span>
            <span className="balance-stat-value">₹{formatCurrency(totalCredit)}</span>
          </div>
        </div>
        <div className="balance-stat">
          <div className="balance-stat-body">
            <span className="balance-stat-label">Last Payment</span>
            <span className="balance-stat-value">
              {lastPayment > 0 ? `₹${formatCurrency(lastPayment)}` : 'Never'}
            </span>
          </div>
        </div>
        <div className="balance-stat">
          <div className="balance-stat-body">
            <span className="balance-stat-label">Total Paid</span>
            <span className="balance-stat-value green">₹{formatCurrency(totalPaid)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-row">
        <button
          className="btn btn-add-credit"
          disabled={offline}
          onClick={() => openAddModal('credit')}
        >
          <i className="fa-solid fa-plus"></i> Add Credit
        </button>
        <button
          className="btn btn-collect"
          disabled={offline}
          onClick={() => openAddModal('pay')}
        >
          <i className="fa-solid fa-check"></i> Collect
        </button>
        <button
          className="btn btn-remind"
          disabled={offline || !customer.phone}
          onClick={() => {
            const msg = encodeURIComponent(`Hi ${customer.name}, this is a reminder about your pending balance of ₹${formatCurrency(customer.balance)}. Please pay at your earliest convenience.`)
            window.open(`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank')
          }}
        >
          <i className="fa-solid fa-bell"></i> Remind
        </button>
      </div>

      <div className="customer-detail-grid">

        {/* Transaction History */}
        <div className="home-section-card">
          <div className="tx-history-header">
            <h3>Transaction History</h3>
            <div className="tx-tabs">
              <button className={`tx-tab ${txFilter === 'all' ? 'active' : ''}`} onClick={() => setTxFilter('all')}>
                All
              </button>
              <button className={`tx-tab ${txFilter === 'credit' ? 'active' : ''}`} onClick={() => setTxFilter('credit')}>
                Credit
              </button>
              <button className={`tx-tab ${txFilter === 'payment' ? 'active' : ''}`} onClick={() => setTxFilter('payment')}>
                Payment
              </button>
            </div>
          </div>

          <div className="tx-list">
            {filteredTransactions.length === 0 ? (
              <div className="empty"><p>No {txFilter === 'all' ? '' : txFilter} transactions yet.</p></div>
            ) : (
              <>
                {filteredTransactions.slice(0, visibleCount).map((tx) => {
                  const isCredit = tx.amount > 0
                  return (
                    <div key={tx.id} className="tx-item" style={{ cursor: 'pointer' }} onClick={() => setSelectedTx(tx)}>
                      <div className="tx-left">
                        <div className={`tx-icon ${isCredit ? 'credit' : 'pay'}`}>
                          <i className={`fa-solid ${isCredit ? 'fa-plus' : 'fa-check'}`}></i>
                        </div>
                        <div>
                          <div className="tx-note">{isCredit ? 'Credit added' : 'Payment collected'}</div>
                          <div className="tx-date">
                            {formatDate(tx.date)} · {formatTime(tx.created_at)}
                            {tx.note ? ` · ${tx.note}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className={`tx-amount ${isCredit ? 'credit' : 'pay'}`}>
                        {isCredit ? '+' : '-'}₹{formatCurrency(Math.abs(tx.amount))}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {filteredTransactions.length > visibleCount && (
            <button className="btn btn-secondary btn-sm btn-block" style={{ marginTop: '12px' }}
              onClick={() => setVisibleCount((prev) => prev + 10)}>
              See more
            </button>
          )}
        </div>

        {/* Recent Activity */}
        <div className="home-section-card">
          <div className="home-section-header">
            <h3>Recent Activity</h3>
            <Link href={`/log/${customerId}`} className="home-section-link">View all</Link>
          </div>

          {logLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : logEntries.length === 0 ? (
            <div className="empty" style={{ padding: '20px 0' }}>
              <i className="fa-solid fa-clock-rotate-left"></i>
              <p>No activity yet.</p>
            </div>
          ) : (
            <div className="activity-list">
              {logEntries.map((entry) => (
                <div key={entry.id} style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '0.88rem',
                  color: 'var(--text)',
                }}>
                  {formatLogEntry(entry)}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Footer Actions */}
      <div className="footer-actions">
        <a href={customer.phone ? `tel:${customer.phone}` : undefined}
          className={`footer-action-item ${!customer.phone ? 'disabled' : ''}`}
          onClick={(e) => { if (!customer.phone) e.preventDefault() }}>
          <div className="footer-action-icon blue"><i className="fa-solid fa-phone"></i></div>
          <span>Call Customer</span>
          <i className="fa-solid fa-chevron-right footer-action-arrow"></i>
        </a>
        <button className="footer-action-item" onClick={openEditCustomer}>
          <div className="footer-action-icon muted"><i className="fa-solid fa-pen"></i></div>
          <span>Edit Customer</span>
          <i className="fa-solid fa-chevron-right footer-action-arrow"></i>
        </button>
        <button className="footer-action-item danger" onClick={() => setDeleteCustomerConfirm(true)}>
          <div className="footer-action-icon red"><i className="fa-solid fa-trash"></i></div>
          <span>Delete Customer</span>
          <i className="fa-solid fa-chevron-right footer-action-arrow"></i>
        </button>
      </div>

      {/* ═══ Modals ═══ */}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="modal-backdrop active" onClick={() => setSelectedTx(null)}>
          <div className="modal-sheet modal-tx-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-tx-detail-title">
                <div className={`tx-icon ${selectedTx.amount > 0 ? 'credit' : 'pay'}`} style={{ width: '28px', height: '28px', fontSize: '0.7rem' }}>
                  <i className={`fa-solid ${selectedTx.amount > 0 ? 'fa-plus' : 'fa-minus'}`}></i>
                </div>
                <h3>Transaction Details</h3>
              </div>
              <button className="modal-close" onClick={() => setSelectedTx(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="tx-detail-body">
              <div className="tx-detail-row">
                <span className="tx-detail-label">Customer</span>
                <span className="tx-detail-value">{customer?.name}</span>
              </div>
              <div className="tx-detail-row">
                <span className="tx-detail-label">Type</span>
                <span className="tx-detail-value">
                  <span className={`tx-icon ${selectedTx.amount > 0 ? 'credit' : 'pay'}`} style={{ width: '20px', height: '20px', fontSize: '0.6rem', display: 'inline-grid' }}>
                    <i className={`fa-solid ${selectedTx.amount > 0 ? 'fa-plus' : 'fa-minus'}`}></i>
                  </span>
                  {selectedTx.amount > 0 ? 'Credit Added' : 'Payment Collected'}
                </span>
              </div>
              <div className="tx-detail-row">
                <span className="tx-detail-label">Amount</span>
                <span className="tx-detail-value">₹{formatCurrency(Math.abs(selectedTx.amount))}</span>
              </div>
              <div className="tx-detail-row">
                <span className="tx-detail-label">Description</span>
                <span className="tx-detail-value">{selectedTx.note || '-'}</span>
              </div>
              <div className="tx-detail-row">
                <span className="tx-detail-label">Date</span>
                <span className="tx-detail-value">{formatDate(selectedTx.date || selectedTx.created_at)}</span>
              </div>
              <div className="tx-detail-row">
                <span className="tx-detail-label">Time</span>
                <span className="tx-detail-value">{formatTime(selectedTx.date || selectedTx.created_at)}</span>
              </div>
            </div>
            <div className="tx-detail-actions">
              <button className="btn btn-outline" onClick={() => { setSelectedTx(null); handleEdit(selectedTx) }}>
                <i className="fa-solid fa-pen"></i> Edit
              </button>
              <button className="btn btn-red" onClick={() => { setSelectedTx(null); setDeleteConfirm(selectedTx.id) }}>
                <i className="fa-solid fa-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer */}
      <div className={`modal-backdrop ${showEditCustomerModal ? 'active' : ''}`} onClick={() => setShowEditCustomerModal(false)}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h3>Edit Customer</h3>
            <button className="modal-close" onClick={() => setShowEditCustomerModal(false)}><i className="fa-solid fa-xmark"></i></button>
          </div>
          <div className="field">
            <label>Name</label>
            <input type="text" placeholder="Customer name" value={editName}
              onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input type="tel" placeholder="Phone number" value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>Opening Balance (₹)</label>
            <input type="number" placeholder="0" min="0" value={editOpeningBalance}
              onChange={(e) => setEditOpeningBalance(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-block" disabled={!editName.trim() || savingCustomer} onClick={handleSaveCustomer}>
            {savingCustomer ? <span className="spinner"></span> : 'Save'}
          </button>
        </div>
      </div>

      {/* Delete Transaction Confirm */}
      {deleteConfirm && (
        <div className="modal-backdrop active" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete transaction?</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)} disabled={deleting}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <p style={{ margin: '16px 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              This action cannot be undone. The customer balance will be recalculated.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary btn-block" onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-red btn-block" onClick={() => handleDelete(deleteConfirm)} disabled={deleting}>
                {deleting ? <span className="spinner"></span> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirm */}
      {deleteCustomerConfirm && (
        <div className="modal-backdrop active" onClick={() => !deletingCustomer && setDeleteCustomerConfirm(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete customer?</h3>
              <button className="modal-close" onClick={() => setDeleteCustomerConfirm(false)} disabled={deletingCustomer}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <p style={{ margin: '16px 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              This will permanently delete <strong>{customer.name}</strong> and all their transactions. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary btn-block" onClick={() => setDeleteCustomerConfirm(false)} disabled={deletingCustomer}>Cancel</button>
              <button className="btn btn-red btn-block" onClick={handleDeleteCustomer} disabled={deletingCustomer}>
                {deletingCustomer ? <span className="spinner"></span> : 'Delete Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionModal
        show={activeModal !== null}
        mode={activeModal === 'pay' ? 'pay' : 'credit'}
        customerId={customerId}
        customerName={customer.name}
        currentBalance={customer.balance}
        editingTx={editingTx}
        onClose={() => { setActiveModal(null); setEditingTx(null) }}
        onSaved={loadData}
      />
    </>
  )
}

export default function CustomerDetail() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    }>
      <CustomerDetailInner />
    </Suspense>
  )
}
