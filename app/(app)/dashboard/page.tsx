'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getInitials, formatCurrency } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  phone?: string
  created_at: string
  balance?: number
}

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [shopName, setShopName] = useState('DawrBa')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortValue, setSortValue] = useState('name-asc')
  const router = useRouter()

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

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('shop_name')
        .eq('id', user.id)
        .single()

      if (profileData?.shop_name) {
        setShopName(profileData.shop_name)
      }

      // Load customers
      const { data: customersData, error } = await supabase
        .from('customers')
        .select('id, name, phone, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch balances for each customer
      let customersWithBalance = customersData || []
      customersWithBalance = await Promise.all(
        customersWithBalance.map(async (c) => {
          const { data: txData } = await supabase
            .from('transactions')
            .select('amount')
            .eq('customer_id', c.id)
          const balance = (txData || []).reduce((sum, t) => sum + (t.amount || 0), 0)
          return { ...c, balance }
        })
      )

      setCustomers(customersWithBalance)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

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
      <style>{`
        .dashboard-title {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        .add-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--blue);
          color: white;
          border: none;
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 1.5rem;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        @media (min-width: 768px) {
          .add-btn { width: 48px; height: 48px; }
        }
      `}</style>

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
              : 'No customers yet. Tap + to add one.'}
          </p>
        </div>
      ) : (
        <div>
          {filteredList.map((customer) => (
            <Link
              key={customer.id}
              href={`/(app)/customers/${customer.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="customer-card">
                <div className="cc-left">
                  <div className="avatar">{getInitials(customer.name)}</div>
                  <div>
                    <div className="cc-name">{customer.name}</div>
                    <div className="cc-meta">{customer.phone || ''}</div>
                  </div>
                </div>
                <div className={`cc-balance ${(customer.balance || 0) <= 0 ? 'zero' : ''}`}>
                  {(customer.balance || 0) <= 0
                    ? '₹0'
                    : '₹' + formatCurrency(customer.balance || 0)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link href="/(app)/add-customer">
        <button className="add-btn" title="Add customer">
          <i className="fa-solid fa-plus"></i>
        </button>
      </Link>
    </>
  )
}
