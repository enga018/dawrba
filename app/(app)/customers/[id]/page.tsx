'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { cacheTransactions, getCachedTransactions } from '@/lib/offline'
import { showToast } from '@/lib/toast'
import { formatLogEntry, type LogEntry } from '@/lib/transactionLog'

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

export default function CustomerDetail() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [logLoading, setLogLoading] = useState(false)
  const [logLoaded, setLogLoaded] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'credit' | 'pay'>('credit')
  const [txAmount, setTxAmount] = useState('')
  const [txNote, setTxNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [offline, setOffline] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false)
  const [openingBalanceInput, setOpeningBalanceInput] = useState('')
  const [savingOpeningBalance, setSavingOpeningBalance] = useState(false)

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
      setModalMode('credit')
      setShowModal(true)
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        router.push('/login')
        return
      }

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
      const cached = getCachedTransactions<Transaction>(customerId)
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

  const loadLog = useCallback(async () => {
    setLogLoading(true)
    try {
      const { data, error } = await supabase
        .from('transaction_logs')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLogEntries(data || [])
      setLogLoaded(true)
    } catch (err) {
      console.error('Error loading transaction log:', err)
    } finally {
      setLogLoading(false)
    }
  }, [customerId])

  const openLogModal = () => {
    setShowLogModal(true)
    if (!logLoaded) loadLog()
  }

  useEffect(() => {
    const handleOnline = () => {
      loadData()
      if (logLoaded) loadLog()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [loadData, loadLog, logLoaded])

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txAmount || parseFloat(txAmount) <= 0) return

    setSubmitting(true)
    try {
      const amount = modalMode === 'pay' ? -parseFloat(txAmount) : parseFloat(txAmount)

      if (editingTx) {
        const { error } = await supabase
          .from('transactions')
          .update({ amount, note: txNote || null, updated_at: new Date().toISOString() })
          .eq('id', editingTx.id)
        if (error) throw error
        showToast('Transaction updated')
      } else {
        const { error } = await supabase.from('transactions').insert({
          customer_id: customerId,
          amount,
          note: txNote || null,
        })
        if (error) throw error
        showToast(modalMode === 'credit' ? 'Credit added' : 'Payment recorded')
      }

      setShowModal(false)
      setTxAmount('')
      setTxNote('')
      setEditingTx(null)
      await loadData()
      if (logLoaded) await loadLog()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save transaction'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setTxAmount(String(Math.abs(tx.amount)))
    setTxNote(tx.note || '')
    setModalMode(tx.amount > 0 ? 'credit' : 'pay')
    setShowModal(true)
  }

  const handleDelete = async (txId: string) => {
    setDeleting(true)
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', txId)
      if (error) throw error
      setDeleteConfirm(null)
      showToast('Transaction deleted')
      await loadData()
      if (logLoaded) await loadLog()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete transaction'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const openOpeningBalanceModal = () => {
    setOpeningBalanceInput(customer ? String(customer.opening_balance) : '')
    setShowOpeningBalanceModal(true)
  }

  const handleSaveOpeningBalance = async () => {
    const value = parseFloat(openingBalanceInput)
    if (isNaN(value) || value < 0) return

    setSavingOpeningBalance(true)
    try {
      const { error } = await supabase
        .from('customers')
        .update({ opening_balance: value })
        .eq('id', customerId)
      if (error) throw error

      showToast('Opening balance updated')
      setShowOpeningBalanceModal(false)
      await loadData()
      if (logLoaded) await loadLog()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update opening balance'
      showToast(msg, 'error')
    } finally {
      setSavingOpeningBalance(false)
    }
  }

  const handleWhatsApp = () => {
    if (!customer || !customer.phone) {
      alert('No phone number for this customer')
      return
    }
    const phone = customer.phone.replace(/[^0-9]/g, '')
    const balance = customer.balance.toLocaleString('en-IN')
    const msg = `Hi ${customer.name}, this is a friendly reminder about your pending balance of ₹${balance}. Please clear it at your earliest convenience.`
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const openAddModal = (mode: 'credit' | 'pay') => {
    setEditingTx(null)
    setTxAmount('')
    setTxNote('')
    setModalMode(mode)
    setShowModal(true)
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

  return (
    <>
      <Link href="/">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Customer</h2>
        </div>
      </Link>

      <div className="detail-card">
        <h2 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>{customer.name}</h2>
        <div className="detail-phone">
          <i className="fa-solid fa-phone"></i>
          <span>{customer.phone || 'No phone'}</span>
        </div>
        <div className={`detail-balance ${customer.balance <= 0 ? 'zero' : ''}`}>
          ₹{formatCurrency(customer.balance)}
        </div>
        {customer.opening_balance > 0 && (
          <div style={{ fontSize: '0.82rem', color: 'var(--meta)', marginTop: '4px' }}>
            Opening balance: ₹{formatCurrency(customer.opening_balance)}
          </div>
        )}
        {customer.created_at && (
          <div style={{ fontSize: '0.75rem', color: 'var(--meta)', marginTop: '8px' }}>
            Customer since {formatDate(customer.created_at)}
          </div>
        )}
        <div className="detail-actions">
          <button
            className="btn btn-red btn-sm"
            disabled={offline}
            onClick={() => openAddModal('credit')}
            title={offline ? 'Unavailable offline' : 'Add Credit'}
          >
            <i className="fa-solid fa-plus"></i> Add Credit
          </button>
          <button
            className="btn btn-green btn-sm"
            disabled={offline}
            onClick={() => openAddModal('pay')}
            title={offline ? 'Unavailable offline' : 'Collect Payment'}
          >
            <i className="fa-solid fa-arrow-right"></i> Collect
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleWhatsApp}>
            <i className="fa-brands fa-whatsapp"></i> Remind
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Recent Transactions</h3>
        <button
          onClick={openLogModal}
          style={{
            fontSize: '0.8rem',
            color: 'var(--blue)',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Transaction Log
        </button>
      </div>
      <div className="tx-list">
        {transactions.length === 0 && !(customer.opening_balance > 0) ? (
          <div className="empty">
            <p>No transactions yet.</p>
          </div>
        ) : (
          <>
          {transactions.map((tx) => {
            const isCredit = tx.amount > 0
            return (
              <div key={tx.id} className="tx-item">
                <div className="tx-left">
                  <div className={`tx-icon ${isCredit ? 'credit' : 'pay'}`}>
                    <i className={`fa-solid ${isCredit ? 'fa-plus' : 'fa-minus'}`}></i>
                  </div>
                  <div>
                    <div className="tx-note">
                      {tx.note || (isCredit ? 'Credit' : 'Payment')}
                    </div>
                    <div className="tx-date">{formatDate(tx.date)}</div>
                  </div>
                </div>
                <div className="tx-actions">
                  <div className={`tx-amount ${isCredit ? 'credit' : 'pay'}`}>
                    {isCredit ? '+' : '-'}₹{formatCurrency(Math.abs(tx.amount))}
                  </div>
                  <div className="tx-btns">
                    <button
                      className="tx-btn"
                      disabled={offline}
                      onClick={() => handleEdit(tx)}
                      title="Edit"
                    >
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button
                      className="tx-btn tx-btn-del"
                      disabled={offline}
                      onClick={() => setDeleteConfirm(tx.id)}
                      title="Delete"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {customer.opening_balance > 0 && (
            <div className="tx-item">
              <div className="tx-left">
                <div className="tx-icon" style={{ background: '#f1f5f9', color: 'var(--muted)' }}>
                  <i className="fa-solid fa-flag"></i>
                </div>
                <div>
                  <div className="tx-note">Opening Balance</div>
                  <div className="tx-date">{formatDate(customer.created_at)}</div>
                </div>
              </div>
              <div className="tx-actions">
                <div className="tx-amount" style={{ color: 'var(--muted)' }}>
                  ₹{formatCurrency(customer.opening_balance)}
                </div>
                <div className="tx-btns">
                  <button
                    className="tx-btn"
                    disabled={offline}
                    onClick={openOpeningBalanceModal}
                    title="Edit"
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Edit Opening Balance modal */}
      <div className={`modal-backdrop ${showOpeningBalanceModal ? 'active' : ''}`} onClick={() => setShowOpeningBalanceModal(false)}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h3>Edit Opening Balance</h3>
            <button className="modal-close" onClick={() => setShowOpeningBalanceModal(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="field">
            <label htmlFor="openingBalance">Amount (₹)</label>
            <input
              type="number"
              id="openingBalance"
              placeholder="0"
              min="0"
              step="1"
              value={openingBalanceInput}
              onChange={(e) => setOpeningBalanceInput(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary btn-block"
            disabled={savingOpeningBalance}
            onClick={handleSaveOpeningBalance}
          >
            {savingOpeningBalance ? <span className="spinner"></span> : 'Save'}
          </button>
        </div>
      </div>

      {/* Transaction Log modal */}
      <div className={`modal-backdrop ${showLogModal ? 'active' : ''}`} onClick={() => setShowLogModal(false)}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h3>Transaction Log</h3>
            <button className="modal-close" onClick={() => setShowLogModal(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          {logLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : logEntries.length === 0 ? (
            <div className="empty">
              <p>No activity yet.</p>
            </div>
          ) : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {logEntries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.88rem',
                    color: 'var(--text)',
                  }}
                >
                  {formatLogEntry(entry)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="modal-backdrop active" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete transaction?</h3>
              <button
                className="modal-close"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p style={{ margin: '16px 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              This action cannot be undone. The customer balance will be recalculated.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary btn-block"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-red btn-block"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
              >
                {deleting ? <span className="spinner"></span> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <div className={`modal-backdrop ${showModal ? 'active' : ''}`} onClick={() => setShowModal(false)}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h3>{editingTx ? 'Edit Transaction' : modalMode === 'credit' ? 'Add Credit' : 'Collect Payment'}</h3>
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form onSubmit={handleAddTransaction}>
            <div className="field">
              <label htmlFor="txAmount">Amount (₹)</label>
              <input
                type="number"
                id="txAmount"
                placeholder="0"
                min="1"
                step="1"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="txNote">
                Note <span style={{ color: 'var(--meta)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                id="txNote"
                placeholder="e.g. Weekly payment"
                value={txNote}
                onChange={(e) => setTxNote(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? <span className="spinner"></span> : editingTx ? 'Update' : 'Save'}
            </button>
          </form>
          {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
        </div>
      </div>

      <style>{`
        .tx-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tx-btns {
          display: flex;
          gap: 4px;
        }
        .tx-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--meta);
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 0.75rem;
          transition: all 0.15s ease;
        }
        .tx-btn:hover {
          border-color: var(--blue);
          color: var(--blue);
        }
        .tx-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .tx-btn-del:hover {
          border-color: var(--red);
          color: var(--red);
        }
      `}</style>
    </>
  )
}