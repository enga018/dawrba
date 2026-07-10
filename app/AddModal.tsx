'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { cacheCustomers, getCachedCustomers } from '@/lib/offline'
import { showToast } from '@/lib/toast'
import { formatCurrency } from '@/lib/utils'
import AmountKeypad from './AmountKeypad'

interface AddModalProps {
  show: boolean
  onClose: () => void
  defaultMode?: 'credit' | 'pay' | 'add-customer'
  defaultCustomerId?: string
}

interface CustomerOption {
  id: string
  name: string
  balance: number
}

export default function AddModal({ show, onClose, defaultMode = 'credit', defaultCustomerId }: AddModalProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [modalMode, setModalMode] = useState<'credit' | 'pay' | 'add-customer'>(defaultMode)
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId || '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newOpeningBalance, setNewOpeningBalance] = useState('')
  const [showExtra, setShowExtra] = useState(false)
  const [extraAmount, setExtraAmount] = useState('')
  const [extraNote, setExtraNote] = useState('')

  useEffect(() => {
    if (show) {
      setModalMode(defaultMode)
      setSelectedCustomerId(defaultCustomerId || '')
      setAmount('')
      setNote('')
      setNewName('')
      setNewPhone('')
      setNewOpeningBalance('')
      setShowExtra(false)
      setExtraAmount('')
      setExtraNote('')

      const load = async () => {
        try {
          const user = (await supabase.auth.getUser()).data.user
          if (!user) return
          const { data } = await supabase
            .from('customers')
            .select('id, name, phone, opening_balance, created_at')
            .eq('user_id', user.id)

          const ids = (data || []).map((c) => c.id)
          const balances: Record<string, number> = {}
          if (ids.length > 0) {
            const { data: txData } = await supabase
              .from('transactions')
              .select('customer_id, amount')
              .in('customer_id', ids)
            for (const t of txData || []) {
              balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)
            }
          }

          const list = (data || []).map((c) => ({
            id: c.id,
            name: c.name,
            balance: (c.opening_balance || 0) + (balances[c.id] || 0),
          }))
          setCustomers(list)
          cacheCustomers(data || [])
        } catch {
          const cached = getCachedCustomers<CustomerOption>()
          if (cached && cached.length > 0) setCustomers(cached)
        }
      }
      load()
    }
  }, [show, defaultMode, defaultCustomerId])

  const close = () => {
    onClose()
  }

  const refresh = () => window.dispatchEvent(new Event('dawrba:refresh'))

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)
  const amountValue = parseFloat(amount) || 0
  const newBalance = selectedCustomer
    ? selectedCustomer.balance + (modalMode === 'pay' ? -amountValue : amountValue)
    : 0

  return (
    <div className={`modal-backdrop ${show ? 'active' : ''}`} onClick={close}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{modalMode === 'pay' ? 'Collect Payment' : modalMode === 'credit' ? 'Add Credit' : 'Add Customer'}</h3>
          <button className="modal-close" onClick={close} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
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
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="amount-keypad-mobile">
              <AmountKeypad value={amount} onChange={setAmount} />
            </div>

            <div className="amount-input-desktop">
              <div className="field">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Note <span style={{ color: 'var(--meta)', fontWeight: 400 }}>(optional)</span></label>
              <input
                type="text"
                placeholder={modalMode === 'pay' ? 'e.g. Cash payment' : 'e.g. Weekly supply'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {selectedCustomer && amountValue > 0 && (
              <div className="detail-card">
                <div className="tx-detail-row">
                  <span className="tx-detail-label">Current Balance</span>
                  <span className="tx-detail-value">Rs.{formatCurrency(selectedCustomer.balance)}</span>
                </div>
                <div className="tx-detail-row">
                  <span className="tx-detail-label">{modalMode === 'pay' ? 'Collecting' : 'Adding'}</span>
                  <span className="tx-detail-value">{modalMode === 'pay' ? '-' : '+'}Rs.{formatCurrency(amountValue)}</span>
                </div>
                <div className="tx-detail-row total">
                  <span className="tx-detail-label">New Balance</span>
                  <span className="tx-detail-value">Rs.{formatCurrency(newBalance)}</span>
                </div>
              </div>
            )}

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
                    note: note || null,
                  })
                  if (error) throw error
                  showToast(modalMode === 'pay' ? 'Payment recorded' : 'Credit added')
                  close()
                  refresh()
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
              type="button"
              className="add-extra-toggle"
              onClick={() => setShowExtra(!showExtra)}
            >
              <i className="fa-solid fa-chevron-down"></i> Add initial credit (extra)
            </button>
            {showExtra && (
              <div className="add-extra show">
                <div className="field">
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    step="1"
                    value={extraAmount}
                    onChange={(e) => setExtraAmount(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Milk supply"
                    value={extraNote}
                    onChange={(e) => setExtraNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: '8px' }}
              disabled={!newName.trim() || submitting}
              onClick={async () => {
                if (!newName.trim()) return
                setSubmitting(true)
                try {
                  const user = (await supabase.auth.getUser()).data.user
                  if (!user) throw new Error('Not authenticated')
                  const { data: customer, error } = await supabase.from('customers').insert({
                    user_id: user.id,
                    name: newName.trim(),
                    phone: newPhone.trim() || null,
                    opening_balance: parseFloat(newOpeningBalance) || 0,
                  }).select().single()
                  if (error) throw error

                  if (extraAmount && parseFloat(extraAmount) > 0) {
                    const { error: txError } = await supabase.from('transactions').insert({
                      customer_id: customer.id,
                      amount: parseFloat(extraAmount),
                      note: extraNote || null,
                    })
                    if (txError) throw txError
                  }

                  showToast('Customer added')
                  close()
                  refresh()
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
  )
}
