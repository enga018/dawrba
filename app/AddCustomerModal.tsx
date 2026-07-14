'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { offlineWrite, isOnline } from '@/lib/offline'
import { showToast } from '@/lib/toast'
import { logActivity } from '@/lib/transactionLog'
import { formatCurrency } from '@/lib/utils'

interface AddCustomerModalProps {
  show: boolean
  onClose: () => void
}

type AmountType = 'opening_balance' | 'initial_credit'

export default function AddCustomerModal({ show, onClose }: AddCustomerModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [amount, setAmount] = useState('')
  const [amountType, setAmountType] = useState<AmountType>('opening_balance')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (show) {
      setName('')
      setPhone('')
      setCreditLimit('')
      setAmount('')
      setAmountType('opening_balance')
      setNote('')
    }
  }, [show])

  const close = () => onClose()
  const refresh = () => window.dispatchEvent(new Event('dawrba:refresh'))

  const totalInitial = parseFloat(amount) || 0

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')
      const trimmedName = name.trim()
      const amt = parseFloat(amount) || 0
      const limit = creditLimit ? parseFloat(creditLimit) : null
      const isOpeningBalance = amountType === 'opening_balance'
      const ob = isOpeningBalance ? amt : 0

      if (isOnline()) {
        const { data: customer, error } = await supabase.from('customers').insert({
          user_id: user.id,
          name: trimmedName,
          phone: phone.trim() || null,
          opening_balance: ob,
          credit_limit: limit,
        }).select().single()
        if (error) throw error

        if (isOpeningBalance && amt > 0) {
          logActivity({ eventType: 'opening_balance', amount: amt, customerId: customer.id })
        }

        if (!isOpeningBalance && amt > 0) {
          const { data: tx, error: txError } = await supabase.from('transactions').insert({
            customer_id: customer.id,
            amount: amt,
            note: note.trim() || null,
          }).select().single()
          if (txError) throw txError
          logActivity({
            transactionId: tx?.id, eventType: 'insert',
            amount: amt, note: note.trim() || null,
            customerId: customer.id,
          })
        }
      } else {
        await offlineWrite(
          async () => ({ data: null, error: null }),
          { table: 'customers', operation: 'insert', data: { user_id: user.id, name: trimmedName, phone: phone.trim() || null, opening_balance: ob, credit_limit: limit } }
        )
        if (!isOpeningBalance && amt > 0) {
          await offlineWrite(
            async () => ({ data: null, error: null }),
            { table: 'transactions', operation: 'insert', data: { amount: amt, note: note.trim() || null } }
          )
        }
      }

      showToast('Customer added')
      close()
      refresh()
    } catch {
      showToast('Failed to add customer', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`modal-backdrop ${show ? 'active' : ''}`} onClick={close}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add Customer</h3>
          <button className="modal-close" onClick={close} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="field">
          <label>Name</label>
          <input
            type="text"
            placeholder="Customer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Phone (optional)</label>
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Credit limit (optional)</label>
          <input
            type="number"
            placeholder="No limit"
            min="0"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Starting amount (optional)</label>
          <input
            type="number"
            placeholder="0"
            min="0"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {totalInitial > 0 && (
          <>
            <div className="tx-tabs" style={{ marginBottom: '8px' }}>
              <button
                type="button"
                className={`tx-tab ${amountType === 'opening_balance' ? 'active' : ''}`}
                onClick={() => setAmountType('opening_balance')}
              >
                Opening Balance
              </button>
              <button
                type="button"
                className={`tx-tab ${amountType === 'initial_credit' ? 'active' : ''}`}
                onClick={() => setAmountType('initial_credit')}
              >
                Initial Credit
              </button>
            </div>
            <p className="field-hint">
              {amountType === 'opening_balance'
                ? "Debt the customer already owed before you started using DawrBa. Added to their balance, but won't appear as a dated transaction."
                : "New credit you're giving right now. Recorded as a transaction dated today, so it shows up in history and reports."}
            </p>

            {amountType === 'initial_credit' && (
              <div className="field">
                <label>Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Milk supply"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            )}

            <div className="detail-card">
              <div className="tx-detail-row">
                <span className="tx-detail-label">Starting Balance</span>
                <span className="tx-detail-value">₹0</span>
              </div>
              <div className="tx-detail-row">
                <span className="tx-detail-label">
                  {amountType === 'opening_balance' ? 'Opening Balance' : 'Initial Credit'}
                </span>
                <span className="tx-detail-value">+₹{formatCurrency(totalInitial)}</span>
              </div>
              <div className="tx-detail-row total">
                <span className="tx-detail-label">New Balance</span>
                <span className="tx-detail-value" style={{ color: 'var(--red)' }}>₹{formatCurrency(totalInitial)}</span>
              </div>
            </div>
          </>
        )}

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: '8px' }}
          disabled={!name.trim() || submitting}
          onClick={handleSubmit}
        >
          {submitting ? <span className="spinner"></span> : 'Add Customer'}
        </button>
      </div>
    </div>
  )
}
