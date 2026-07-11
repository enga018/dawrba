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

function getTenantPlan(customerCount: number) {
  return customerCount >= 100 ? 'Pro' : 'Basic'
}

export default function AdminTenantsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all')
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
  const activeTenants = data?.total ?? 0
  const trialTenants = Math.min(3, data?.total ?? 0)
  const suspendedTenants = 0

  const filteredTenants = data?.tenants.filter((t) => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'active') return true
    if (statusFilter === 'trial') return t.customerCount < 20
    if (statusFilter === 'suspended') return false
    return true
  }) ?? []

  return (
    <>
      <div className="admin-section" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <div>
            <h2 className="admin-section-title" style={{ marginBottom: 4 }}>Tenants</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>
              Manage all tenant accounts
            </p>
          </div>

          <button className="btn btn-primary">
            <i className="fa-solid fa-plus"></i>
            Add Tenant
          </button>
        </div>

        <div className="report-stats-grid" style={{ marginBottom: 0 }}>
          <div className="report-stat-card">
            <div className="report-stat-header">
              <div className="report-stat-label">Total</div>
              <div className="report-stat-icon report-stat-icon-blue">
                <i className="fa-solid fa-store"></i>
              </div>
            </div>
            <div className="report-stat-value">{data?.total ?? '—'}</div>
            <div className="report-stat-sub">All registered shops</div>
          </div>

          <div className="report-stat-card">
            <div className="report-stat-header">
              <div className="report-stat-label">Active</div>
              <div className="report-stat-icon report-stat-icon-green">
                <i className="fa-solid fa-check"></i>
              </div>
            </div>
            <div className="report-stat-value">{activeTenants}</div>
            <div className="report-stat-sub">Active accounts</div>
          </div>

          <div className="report-stat-card">
            <div className="report-stat-header">
              <div className="report-stat-label">Trial</div>
              <div className="report-stat-icon report-stat-icon-orange">
                <i className="fa-solid fa-hourglass-half"></i>
              </div>
            </div>
            <div className="report-stat-value">{trialTenants}</div>
            <div className="report-stat-sub">New accounts</div>
          </div>

          <div className="report-stat-card">
            <div className="report-stat-header">
              <div className="report-stat-label">Suspended</div>
              <div className="report-stat-icon report-stat-icon-orange">
                <i className="fa-solid fa-ban"></i>
              </div>
            </div>
            <div className="report-stat-value">{suspendedTenants}</div>
            <div className="report-stat-sub">Accounts under review</div>
          </div>
        </div>
      </div>

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

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        {(['all', 'active', 'trial', 'suspended'] as const).map((filter) => (
          <button
            key={filter}
            className={`btn btn-sm ${statusFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setStatusFilter(filter)
              setPage(1)
            }}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
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

      {data && filteredTenants.length === 0 && (
        <div className="empty">
          <i className="fa-solid fa-store-slash"></i>
          <p>No shop owners found</p>
        </div>
      )}

      {data && filteredTenants.length > 0 && (
        <div className="admin-section">
          <div className="admin-table-wrap" style={{ display: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Plan</th>
                  <th>Customers</th>
                  <th>Transactions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.shopName || '(No shop name)'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        {t.phone || t.email || '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${getTenantPlan(t.customerCount) === 'Pro' ? 'status-active' : 'status-trial'}`}>
                        {getTenantPlan(t.customerCount)}
                      </span>
                    </td>
                    <td>{t.customerCount}</td>
                    <td>{t.transactionCount}</td>
                    <td>
                      <span className="status-badge status-active">Active</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => router.push(`/admin/tenants/${t.id}`)}
                        >
                          View
                        </button>
                        <button className="btn btn-secondary btn-sm">Edit</button>
                        <button className="btn btn-danger btn-sm">Suspend</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tenant-cards">
            {filteredTenants.map((t) => (
              <div key={t.id} className="tenant-card">
                <div className="tenant-card-header">
                  <div>
                    <div className="tenant-card-title">{t.shopName || '(No shop name)'}</div>
                    <div className="tenant-card-phone">{t.phone || t.email || '—'}</div>
                  </div>
                  <div className="tenant-card-badges">
                    <span className={`status-badge ${getTenantPlan(t.customerCount) === 'Pro' ? 'status-active' : 'status-trial'}`}>
                      {getTenantPlan(t.customerCount)}
                    </span>
                    <span className="status-badge status-active">Active</span>
                  </div>
                </div>

                <div className="tenant-card-metrics">
                  <div className="tenant-metric">
                    <span className="tenant-metric-label">Customers</span>
                    <span className="tenant-metric-value">{t.customerCount}</span>
                  </div>
                  <div className="tenant-metric">
                    <span className="tenant-metric-label">Transactions</span>
                    <span className="tenant-metric-value">{t.transactionCount}</span>
                  </div>
                  <div className="tenant-metric">
                    <span className="tenant-metric-label">Last Active</span>
                    <span className="tenant-metric-value">
                      {t.lastActivity ? formatRelativeTime(t.lastActivity) : '—'}
                    </span>
                  </div>
                </div>

                <div className="tenant-card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => router.push(`/admin/tenants/${t.id}`)}
                  >
                    View
                  </button>
                  <button className="btn btn-secondary btn-sm">Edit</button>
                  <button className="btn btn-danger btn-sm">Suspend</button>
                </div>
              </div>
            ))}
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

      <style jsx>{`
        .tenant-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tenant-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 16px;
          box-shadow: var(--shadow-sm);
        }

        .tenant-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .tenant-card-title {
          font-weight: 700;
          font-size: 1rem;
          color: var(--text);
        }

        .tenant-card-phone {
          font-size: 0.9rem;
          color: var(--muted);
          margin-top: 4px;
        }

        .tenant-card-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          line-height: 1;
        }

        .status-active {
          background: rgba(34, 197, 94, 0.14);
          color: #16a34a;
        }

        .status-trial {
          background: rgba(249, 115, 22, 0.14);
          color: #ea580c;
        }

        .tenant-card-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .tenant-metric {
          background: var(--surface);
          border-radius: 14px;
          padding: 10px;
          text-align: center;
        }

        .tenant-metric-label {
          display: block;
          font-size: 0.72rem;
          color: var(--muted);
          margin-bottom: 6px;
        }

        .tenant-metric-value {
          display: block;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
        }

        .tenant-card-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .tenant-card-actions .btn {
          width: 100%;
          justify-content: center;
        }

        @media (min-width: 768px) {
          .tenant-cards {
            display: none;
          }

          .admin-table-wrap {
            display: block !important;
          }
        }
      `}</style>
    </>
  )
}
