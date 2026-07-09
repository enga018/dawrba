'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getInitials } from '@/lib/utils'

interface ExistingCustomer {
  id: string
  name: string
  phone?: string
}

export default function AddCustomer() {
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
  const [existingCustomers, setExistingCustomers] = useState<ExistingCustomer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
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
    }
    loadExisting()
  }, [])

  const searchResults =
    searchQuery.trim().length === 0
      ? []
      : existingCustomers.filter((c) =>
          c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        )

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
          <h2>Add Customer</h2>
        </div>
      </Link>

      <div className="field">
        <label htmlFor="existingSearch">Add credit to an existing customer</label>
        <input
          type="text"
          id="existingSearch"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {searchQuery.trim().length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          {searchResults.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--meta)', padding: '4px 2px' }}>
              No matching customer — add as new below.
            </div>
          ) : (
            <div className="customer-list">
              {searchResults.map((c) => (
                <div
                  key={c.id}
                  className="customer-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/customers/${c.id}?addCredit=1`)}
                >
                  <div className="cc-left">
                    <div className="avatar">{getInitials(c.name)}</div>
                    <div>
                      <div className="cc-name">{c.name}</div>
                      <div className="cc-meta">{c.phone || ''}</div>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right" style={{ color: 'var(--meta)' }}></i>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '18px 0', color: 'var(--meta)', fontSize: '0.8rem', fontWeight: 600 }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
        OR ADD A NEW CUSTOMER
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
      </div>

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
