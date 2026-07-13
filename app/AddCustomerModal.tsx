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

export default function AddCustomerModal({ show, onClose }: AddCustomerModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [showExtra, setShowExtra] = useState(false)
  const [extraAmount, setExtraAmount] = useState('')
  const [extraNote, setExtraNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (show) {
      setName('')
      setPhone('')
      setOpeningBalance('')
      setCreditLimit('')
      setShowExtra(false)
      setExtraAmount('')
      setExtraNote('')
    }
  }, [show])

  const close = () => onClose()
  const refresh = () => window.dispatchEvent(new Event('dawrba:refresh'))

  const totalInitial = (parseFloat(openingBalance) || 0) + (showExtra ? (parseFloat(extraAmount) || 0) : 0)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')
      const trimmedName = name.trim()
      const ob = parseFloat(openingBalance) || 0
      const limit = creditLimit ? parseFloat(creditLimit) : null

      if (isOnline()) {
        const { data: customer, error } = await supabase.from('customers').insert({
          user_id: user.id,
          name: trimmedName,
          phone: phone.trim() || null,
          opening_balance: ob,
          credit_limit: limit,
        }).select().single()
        if (error) throw error

        if (ob > 0) {
          logActivity({ eventType: 'opening_balance', amount: ob, customerId: customer.id })
        }

        if (extraAmount && parseFloat(extraAmount) > 0) {
          const { data: tx, error: txError } = await supabase.from('transactions').insert({
            customer_id: customer.id,
            amount: parseFloat(extraAmount),
            note: extraNote || null,
          }).select().single()
          if (txError) throw txError
          logActivity({
            transactionId: tx?.id, eventType: 'insert',
            amount: parseFloat(extraAmount), note: extraNote || null,
            customerId: customer.id,
          })
        }
      } else {
        await offlineWrite(
          async () => ({ data: null, error: null }),
          { table: 'customers', operation: 'insert', data: { user_id: user.id, name: trimmedName, phone: phone.trim() || null, opening_balance: ob, credit_limit: limit } }
        )
        if (extraAmount && parseFloat(extraAmount) > 0) {
          await offlineWrite(
            async () => ({ data: null, error: null }),
            { table: 'transactions', operation: 'insert', data: { amount: parseFloat(extraAmount), note: extraNote || null } }
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
          <label>Opening Balance (optional)</label>
          <input
            type="number"
            placeholder="0"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
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

        {totalInitial > 0 && (
          <div className="detail-card">
            <div className="tx-detail-row">
              <span className="tx-detail-label">Starting Balance</span>
              <span className="tx-detail-value">₹0</span>
            </div>
            <div className="tx-detail-row">
              <span className="tx-detail-label">Initial Credit</span>
              <span className="tx-detail-value">+₹{formatCurrency(totalInitial)}</span>
            </div>
            <div className="tx-detail-row total">
              <span className="tx-detail-label">New Balance</span>
              <span className="tx-detail-value" style={{ color: 'var(--red)' }}>₹{formatCurrency(totalInitial)}</span>
            </div>
          </div>
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
