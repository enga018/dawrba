'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetchJson } from '@/lib/adminApiClient'
import { formatDate, formatRelativeTime } from '@/lib/utils'

interface Tenant {
  id: string
  email: string | null
  shopName: string | null
  phone: string | null
  signupDate: string | null
  customerCount: number
  transactionCount: number
  lastActivity: string | null
}

interface TenantsResponse {
  tenants: Tenant[]
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZE = 20

export default function AdminTenantsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<TenantsResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => {
      setError('')
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(search ? { search } : {}),
      })
      adminFetchJson<TenantsResponse>(`/api/admin/tenants?${params.toString()}`)
        .then(setData)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tenants'))
    }, 250)

    return () => clearTimeout(timeout)
  }, [search, page])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <>
      <div className="admin-search">
        <input
          type="text"
          placeholder="Search by shop name, phone, or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

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

      {data && data.tenants.length === 0 && (
        <div className="empty">
          <i className="fa-solid fa-store-slash"></i>
          <p>No shop owners found</p>
        </div>
      )}

      {data && data.tenants.length > 0 && (
        <div className="admin-section">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Contact</th>
                  <th>Customers</th>
                  <th>Transactions</th>
                  <th>Last Activity</th>
                  <th>Signed Up</th>
                </tr>
              </thead>
              <tbody>
                {data.tenants.map((t) => (
                  <tr
                    key={t.id}
                    className="admin-table-row-link"
                    onClick={() => router.push(`/admin/tenants/${t.id}`)}
                  >
                    <td>{t.shopName || '(No shop name)'}</td>
                    <td>{t.phone || t.email || '—'}</td>
                    <td>{t.customerCount}</td>
                    <td>{t.transactionCount}</td>
                    <td>{t.lastActivity ? formatRelativeTime(t.lastActivity) : 'No activity'}</td>
                    <td>{formatDate(t.signupDate?.slice(0, 10))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
