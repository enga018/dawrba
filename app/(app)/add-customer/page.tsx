'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { showToast } from '@/lib/toast'

interface ExistingCustomer {
  id: string
  name: string
  phone?: string
}

export default function AddCustomer() {
  const [modalMode, setModalMode] = useState<'credit' | 'add-customer'>('credit')
  const [existingCustomers, setExistingCustomers] = useState<ExistingCustomer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    openingBalance: '',
    amount: '',
    note: '',
  })
  const [showExtra, setShowExtra] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const loadExisting = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
      setExistingCustomers(data || [])
      if ((data || []).length === 0) setModalMode('add-customer')
    }
    loadExisting()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerId || !amount || parseFloat(amount) <= 0) return

    setError('')
    setLoading(true)
    try {
      const { error: txError } = await supabase.from('transactions').insert({
        customer_id: selectedCustomerId,
        amount: parseFloat(amount),
        note: note || null,
      })
      if (txError) throw txError

      showToast('Credit added')
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add credit')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')

      const ob = parseFloat(formData.openingBalance) || 0
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          name: formData.name,
          phone: formData.phone || null,
          opening_balance: ob,
        })
        .select()
        .single()

      if (customerError) throw customerError

      if (formData.amount && parseFloat(formData.amount) > 0) {
        const { error: txError } = await supabase.from('transactions').insert({
          customer_id: customer.id,
          amount: parseFloat(formData.amount),
          note: formData.note || null,
        })
        if (txError) throw txError
      }

      showToast('Customer added')
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Link href="/">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>{modalMode === 'credit' ? 'Add Credit' : 'Add Customer'}</h2>
        </div>
      </Link>

      {modalMode === 'credit' ? (
        <form onSubmit={handleAddCredit}>
          <div className="field">
            <label htmlFor="selectedCustomer">Select customer</label>
            <select
              id="selectedCustomer"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              required
            >
              <option value="">Choose a customer...</option>
              {existingCustomers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="amount">Amount (₹)</label>
            <input
              type="number"
              id="amount"
              placeholder="0"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="note">
              Note <span style={{ color: 'var(--meta)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              id="note"
              placeholder="e.g. Milk supply"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={!selectedCustomerId || !amount || loading}
          >
            {loading ? <span className="spinner"></span> : 'Add Credit'}
          </button>
          {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
          <button
            type="button"
            className="btn btn-secondary btn-block"
            style={{ marginTop: '10px' }}
            onClick={() => {
              setError('')
              setModalMode('add-customer')
            }}
          >
            Add New Customer Instead
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Customer name</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label htmlFor="openingBalance">Opening balance (₹) <span style={{ color: 'var(--meta)', fontWeight: 400 }}>(optional)</span></label>
            <input
              type="number"
              id="openingBalance"
              name="openingBalance"
              placeholder="0"
              min="0"
              step="1"
              value={formData.openingBalance}
              onChange={handleChange}
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
                <label htmlFor="initialAmount">Amount (₹)</label>
                <input
                  type="number"
                  id="initialAmount"
                  name="amount"
                  placeholder="0"
                  min="0"
                  step="1"
                  value={formData.amount}
                  onChange={handleChange}
                />
              </div>
              <div className="field">
                <label htmlFor="initialNote">Note</label>
                <input
                  type="text"
                  id="initialNote"
                  name="note"
                  placeholder="e.g. Milk supply"
                  value={formData.note}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? <span className="spinner"></span> : 'Save Customer'}
          </button>
          {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
          {existingCustomers.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: '10px' }}
              onClick={() => {
                setError('')
                setModalMode('credit')
              }}
            >
              Back to Add Credit
            </button>
          )}
        </form>
      )}
    </>
  )
}
