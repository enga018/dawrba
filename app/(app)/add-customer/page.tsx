'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AddCustomer() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    amount: '',
    note: '',
  })
  const [showExtra, setShowExtra] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          name: formData.name,
          phone: formData.phone || null,
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

      router.push('/(app)/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Link href="/(app)/dashboard">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Add Customer</h2>
        </div>
      </Link>

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
        <button
          type="button"
          className="add-extra-toggle"
          onClick={() => setShowExtra(!showExtra)}
        >
          <i className="fa-solid fa-chevron-down"></i> Add initial credit
        </button>
        {showExtra && (
          <div className="add-extra show">
            <div className="field">
              <label htmlFor="amount">Amount (₹)</label>
              <input
                type="number"
                id="amount"
                name="amount"
                placeholder="0"
                min="0"
                step="1"
                value={formData.amount}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label htmlFor="note">Note</label>
              <input
                type="text"
                id="note"
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
      </form>
    </>
  )
}
