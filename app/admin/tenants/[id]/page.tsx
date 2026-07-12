'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { adminFetchJson } from '@/lib/adminApiClient'
import { formatCurrency, formatDate, formatTimestampDate } from '@/lib/utils'

interface TenantCustomer {
  id: string
  name: string
  phone: string | null
  opening_balance: number
  created_at: string
}

interface TenantTransaction {
  id: string
  customer_id: string
  customerName: string
  amount: number
  note: string | null
  date: string | null
  created_at: string
}

interface TenantDetail {
  profile: {
    id: string
    email: string | null
    signupDate: string | null
    shopName: string | null
    phone: string | null
  }
  customers: TenantCustomer[]
  recentTransactions: TenantTransaction[]
}

export default function AdminTenantDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<TenantDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!params?.id) return
    adminFetchJson<TenantDetail>(`/api/admin/tenants/${params.id}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tenant'))
  }, [params?.id])

  return (
    <>
      <Link href="/admin/tenants" className="admin-back-link">
        <i className="fa-solid fa-arrow-left"></i> Back to tenants
      </Link>

      {error && (
        <div className="empty">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <p>{error}</p>
        </div>
      )}

      {!error && !data && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="spinner" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--blue)', margin: '0 auto' }}></div>
        </div>
      )}

      {data && (
        <>
          <div className="admin-detail-header">
            <h2>{data.profile.shopName || '(No shop name)'}</h2>
          </div>
          <div className="admin-detail-meta">
            <span>{data.profile.email || 'No email'}</span>
            <span>{data.profile.phone || 'No phone'}</span>
            <span>Signed up {formatDate(data.profile.signupDate?.slice(0, 10))}</span>
          </div>

          <div className="admin-section">
            <h3 className="admin-section-title">Customers ({data.customers.length})</h3>
            {data.customers.length === 0 ? (
              <div className="empty">
                <i className="fa-solid fa-users-slash"></i>
                <p>No customers yet</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Opening Balance</th>
                      <th>Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.phone || '—'}</td>
                        <td>₹{formatCurrency(c.opening_balance || 0)}</td>
                        <td>{formatDate(c.created_at?.slice(0, 10))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="admin-section">
            <h3 className="admin-section-title">Recent Transactions</h3>
            {data.recentTransactions.length === 0 ? (
              <div className="empty">
                <i className="fa-solid fa-receipt"></i>
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Note</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.map((t) => (
                      <tr key={t.id}>
                        <td>{t.customerName}</td>
                        <td>
                          <span className={`tx-amount ${t.amount > 0 ? 'credit' : 'pay'}`}>
                            {t.amount > 0 ? '+' : '-'}₹{formatCurrency(Math.abs(t.amount))}
                          </span>
                        </td>
                        <td>{t.note || '—'}</td>
                        <td>{formatTimestampDate(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
