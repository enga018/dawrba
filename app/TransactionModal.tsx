'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { cacheCustomers, getCachedCustomers, offlineWrite, isOnline, putTransaction } from '@/lib/offline'
import { showToast } from '@/lib/toast'
import { formatCurrency } from '@/lib/utils'
import { logActivity } from '@/lib/transactionLog'
import AmountKeypad from './AmountKeypad'

interface EditingTx {
  id: string
  amount: number
  note?: string
}

interface TransactionModalProps {
  show: boolean
  mode: 'credit' | 'pay'
  onClose: () => void
  customerId?: string
  customerName?: string
  currentBalance?: number
  editingTx?: EditingTx | null
  onSaved?: () => void
}

interface CustomerOption {
  id: string
  name: string
  balance: number
}

export default function TransactionModal({
  show,
  mode,
  onClose,
  customerId,
  customerName,
  currentBalance,
  editingTx,
  onSaved,
}: TransactionModalProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fixedCustomer = Boolean(customerId)

  useEffect(() => {
    if (!show) return

    setAmount(editingTx ? String(Math.abs(editingTx.amount)) : '')
    setNote(editingTx?.note || '')
    setSelectedCustomerId(customerId || '')

    if (fixedCustomer) return

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
        const cached = await getCachedCustomers<CustomerOption>()
        if (cached && cached.length > 0) setCustomers(cached)
      }
    }
    load()
  }, [show, customerId, editingTx, fixedCustomer])

  const close = () => onClose()
  const refresh = () => window.dispatchEvent(new Event('dawrba:refresh'))

  const selectedCustomer = fixedCustomer
    ? { name: customerName || '', balance: currentBalance ?? 0 }
    : customers.find((c) => c.id === selectedCustomerId)
  const amountValue = parseFloat(amount) || 0
  const signedAmount = mode === 'pay' ? -amountValue : amountValue
  const newBalance = selectedCustomer
    ? selectedCustomer.balance + signedAmount - (editingTx?.amount ?? 0)
    : 0

  const title = editingTx ? 'Edit Transaction' : mode === 'pay' ? 'Collect Payment' : 'Add Credit'
  const targetLabel = mode === 'pay' ? 'Collecting from' : 'Adding credit to'

  const handleSubmit = async () => {
    const targetCustomerId = customerId || selectedCustomerId
    if (!targetCustomerId || !amountValue) return

    if (mode === 'pay' && selectedCustomer) {
      const effectiveBalance = selectedCustomer.balance - (editingTx?.amount ?? 0)
      if (amountValue > effectiveBalance) {
        showToast(`Payment exceeds outstanding balance (₹${formatCurrency(effectiveBalance)})`, 'error')
        return
      }
    }

    setSubmitting(true)
    try {
      if (editingTx) {
        const result = await offlineWrite(
          async () => {
            const { error } = await supabase
              .from('transactions')
              .update({ amount: signedAmount, note: note || null, updated_at: new Date().toISOString() })
              .eq('id', editingTx.id)
            if (error) throw error
            logActivity({
              transactionId: editingTx.id,
              eventType: 'update',
              amount: signedAmount,
              previousAmount: editingTx.amount,
              note: note || null,
              previousNote: editingTx.note || null,
              customerId: targetCustomerId,
            })
            return { data: null, error: null }
          },
          { table: 'transactions', operation: 'update', data: { amount: signedAmount, note: note || null, updated_at: new Date().toISOString() }, filters: { id: editingTx.id } }
        )
        if (result?.error) throw result.error
      } else {
        const result = await offlineWrite(
          async () => {
            const { data, error } = await supabase.from('transactions').insert({
              customer_id: targetCustomerId,
              amount: signedAmount,
              note: note || null,
            }).select().single()
            if (error) throw error
            logActivity({
              transactionId: data?.id,
              eventType: 'insert',
              amount: signedAmount,
              customerId: targetCustomerId,
            })
            return { data, error: null }
          },
          { table: 'transactions', operation: 'insert', data: { customer_id: targetCustomerId, amount: signedAmount, note: note || null } }
        )
        if (result?.error) throw result.error
        if (!isOnline()) {
          putTransaction({
            id: `local_${crypto.randomUUID()}`,
            customerId: targetCustomerId,
            amount: signedAmount,
            note: note || undefined,
            created_at: new Date().toISOString(),
          })
        }
      }
      showToast(editingTx ? 'Transaction updated' : mode === 'pay' ? 'Payment recorded' : 'Credit added')
      close()
      refresh()
      onSaved?.()
    } catch {
      showToast(editingTx ? 'Failed to update transaction' : mode === 'pay' ? 'Failed to record payment' : 'Failed to add credit', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`modal-backdrop ${show ? 'active' : ''}`} onClick={close}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={close} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-content">
          <div className="amount-entry">
            <div className="amount-display">
              ₹{amount ? Number(amount).toLocaleString('en-IN') : '0'}
            </div>
            <div className="amount-target">
              <span className="amount-target-label">{targetLabel}</span>
              {fixedCustomer ? (
                <span className="amount-target-name">{customerName}</span>
              ) : (
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
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
              placeholder={mode === 'pay' ? 'e.g. Cash payment' : 'e.g. Weekly supply'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {selectedCustomer && (
            <div className="detail-card">
              <div className="tx-detail-row">
                <span className="tx-detail-label">Current Balance</span>
                <span className="tx-detail-value">₹{formatCurrency(selectedCustomer.balance)}</span>
              </div>
              <div className="tx-detail-row">
                <span className="tx-detail-label">{mode === 'pay' ? 'Collecting' : 'Adding'}</span>
                <span className="tx-detail-value">{mode === 'pay' ? '-' : '+'}₹{formatCurrency(amountValue)}</span>
              </div>
              <div className="tx-detail-row total">
                <span className="tx-detail-label">New Balance</span>
                <span className="tx-detail-value">₹{formatCurrency(newBalance)}</span>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary btn-block"
            disabled={!(customerId || selectedCustomerId) || !amount || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <span className="spinner"></span> : editingTx ? 'Update' : mode === 'pay' ? 'Collect Payment' : 'Add Credit'}
          </button>
        </div>

        <div className="amount-keypad-mobile">
          <AmountKeypad value={amount} onChange={setAmount} />
        </div>
      </div>
    </div>
  )
}
