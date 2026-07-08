'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  phone?: string
  balance: number
}

interface Transaction {
  id: string
  amount: number
  note?: string
  date?: string
  created_at: string
}

export default function CustomerDetail() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'credit' | 'pay'>('credit')
  const [txAmount, setTxAmount] = useState('')
  const [txNote, setTxNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        router.push('/login')
        return
      }

      // Load customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('id', customerId)
        .eq('user_id', user.id)
        .single()

      if (customerError) throw customerError

      // Load transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (txError) throw txError

      const balance = (txData || []).reduce((sum, t) => sum + (t.amount || 0), 0)
      setCustomer({ ...customerData, balance })
      setTransactions(txData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txAmount || parseFloat(txAmount) <= 0) return

    setSubmitting(true)
    try {
      const amount = modalMode === 'pay' ? -parseFloat(txAmount) : parseFloat(txAmount)
      const { error } = await supabase.from('transactions').insert({
        customer_id: customerId,
        amount,
        note: txNote || null,
      })

      if (error) throw error
      setShowModal(false)
      setTxAmount('')
      setTxNote('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction')
    } finally {
      setSubmitting(false)
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
      <style>{`
        .modal-backdrop.active {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }
      `}</style>

      <Link href="/dashboard">
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
        <div className="detail-actions">
          <button
            className="btn btn-green btn-sm"
            onClick={() => {
              setModalMode('credit')
              setShowModal(true)
            }}
          >
            <i className="fa-solid fa-plus"></i> Add Credit
          </button>
          <button
            className="btn btn-red btn-sm"
            onClick={() => {
              setModalMode('pay')
              setShowModal(true)
            }}
          >
            <i className="fa-solid fa-arrow-right"></i> Pay
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleWhatsApp}>
            <i className="fa-brands fa-whatsapp"></i> Remind
          </button>
        </div>
      </div>

      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>Transactions</h3>
      <div className="tx-list">
        {transactions.length === 0 ? (
          <div className="empty">
            <p>No transactions yet.</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const isCredit = tx.amount > 0
            return (
              <div key={tx.id} className="tx-item">
                <div className="tx-left">
                  <div className={`tx-icon ${isCredit ? 'credit' : 'pay'}`}>
                    <i className={`fa-solid ${isCredit ? 'fa-plus' : 'fa-minus'}`}></i>
                  </div>
                  <div>
                    <div className="tx-note">{tx.note || (isCredit ? 'Credit' : 'Payment')}</div>
                    <div className="tx-date">{formatDate(tx.date)}</div>
                  </div>
                </div>
                <div className={`tx-amount ${isCredit ? 'credit' : 'pay'}`}>
                  {isCredit ? '+' : '-'}₹{formatCurrency(Math.abs(tx.amount))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      <div className={`modal-backdrop ${showModal ? 'active' : ''}`} onClick={() => setShowModal(false)}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h3>{modalMode === 'credit' ? 'Add Credit' : 'Make Payment'}</h3>
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
              {submitting ? <span className="spinner"></span> : 'Save'}
            </button>
          </form>
          {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
        </div>
      </div>
    </>
  )
}
