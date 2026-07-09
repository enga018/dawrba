'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getInitials, formatCurrency, formatRelativeTime } from '@/lib/utils'
import { cacheCustomers, getCachedCustomers } from '@/lib/offline'
import DashboardSummary from './DashboardSummary'

interface Customer {
  id: string
  name: string
  phone?: string
  created_at: string
  balance?: number
}

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortValue, setSortValue] = useState('name-asc')
  const [offline, setOffline] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/customers')
      const customersData = await res.json()
      setCustomers(customersData || [])
      cacheCustomers(customersData || [])
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

  return (
    <>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="empty">
          <i className="fa-solid fa-users-slash"></i>
          <p>
            {searchQuery
              ? 'No customers match your search.'
              : 'No customers yet.'}
          </p>
        </div>
      ) : (
        <>
          <DashboardSummary />

          <div className="customer-list">
            {filteredList.map((customer) => (
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
        </>
      )}

      <Link href={offline ? '#' : '/add-customer'}>
        <button
          className="add-btn"
          title={offline ? 'Unavailable offline' : 'Add customer'}
          disabled={offline}
          style={{ opacity: offline ? 0.5 : 1, cursor: offline ? 'not-allowed' : 'pointer' }}
        >
          <i className="fa-solid fa-plus"></i>
        </button>
      </Link>
      </div>
    </>
  )
}