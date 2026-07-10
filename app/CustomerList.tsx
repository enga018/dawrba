'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getInitials, formatCurrency, formatRelativeTime } from '@/lib/utils'
import { cacheCustomers, getCachedCustomers } from '@/lib/offline'

interface Customer {
  id: string
  name: string
  phone?: string
  created_at: string
  balance?: number
}

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortValue, setSortValue] = useState('name-asc')
  const [visibleCount, setVisibleCount] = useState(20)

  const loadData = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        setLoading(false)
        return
      }

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone, opening_balance, created_at')
        .eq('user_id', user.id)

      if (customersError) throw customersError

      const ids = (customersData || []).map((c) => c.id)
      const balances: Record<string, number> = {}

      if (ids.length > 0) {
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('customer_id, amount')
          .in('customer_id', ids)

        if (txError) throw txError

        for (const t of txData || []) {
          balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)
        }
      }

      const withBalance = (customersData || []).map((c) => ({
        ...c,
        balance: (c.opening_balance || 0) + (balances[c.id] || 0),
      }))

      setCustomers(withBalance)
      cacheCustomers(withBalance)
    } catch {
      const cached = getCachedCustomers<Customer>()
      if (cached && cached.length > 0) {
        setCustomers(cached)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handleOnline = () => loadData()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [loadData])

  const getFilteredSorted = () => {
    let list = [...customers]

    if (searchQuery) {
      list = list.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    switch (sortValue) {
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        list.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'balance-desc':
        list.sort((a, b) => (b.balance || 0) - (a.balance || 0))
        break
      case 'balance-asc':
        list.sort((a, b) => (a.balance || 0) - (b.balance || 0))
        break
      case 'newest':
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
    }

    return list
  }

  const filteredList = getFilteredSorted()

  useEffect(() => {
    setVisibleCount(20)
  }, [searchQuery, sortValue])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="empty">
        <i className="fa-solid fa-users-slash"></i>
        <p>No customers yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="toolbar">
        <div className="search-wrap">
          <i className="fa-solid fa-search"></i>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="sort-wrap">
          <select value={sortValue} onChange={(e) => setSortValue(e.target.value)}>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="balance-desc">Balance (High-Low)</option>
            <option value="balance-asc">Balance (Low-High)</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div className="empty">
          <p>No customers match your search.</p>
        </div>
      ) : (
        <>
          <div className="customer-list">
            {filteredList.slice(0, visibleCount).map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="customer-card"
                style={{ textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div className="avatar">{getInitials(customer.name)}</div>
                  <div>
                    <div className="cc-name">{customer.name}</div>
                    <div className="cc-meta">
                      {customer.phone || (customer.created_at ? formatRelativeTime(customer.created_at) : '')}
                      {customer.phone && customer.created_at ? ` · ${formatRelativeTime(customer.created_at)}` : ''}
                    </div>
                  </div>
                </div>
                <div className={`cc-balance ${(customer.balance || 0) <= 0 ? 'zero' : ''}`}>
                  {(customer.balance || 0) <= 0
                    ? '₹0'
                    : '₹' + formatCurrency(customer.balance || 0)}
                </div>
              </Link>
            ))}
          </div>

          {filteredList.length > visibleCount && (
            <button
              className="btn btn-secondary btn-sm btn-block"
              style={{ marginTop: '12px' }}
              onClick={() => setVisibleCount((prev) => prev + 20)}
            >
              See more
            </button>
          )}
        </>
      )}
    </>
  )
}
