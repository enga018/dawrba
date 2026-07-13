'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, adminFetchJson } from '@/lib/adminApiClient'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import AddTenantModal from '../AddTenantModal'

type TenantStatus = 'active' | 'suspended' | 'pending'

interface Tenant {
  id: string
  email: string | null
  shopName: string | null
  ownerName: string | null
  phone: string | null
  signupDate: string | null
  customerCount: number
  lastActive: string | null
  status: TenantStatus
}

interface TenantsResponse {
  tenants: Tenant[]
  total: number
  page: number
  pageSize: number
  counts: { all: number; active: number; pending: number; suspended: number }
}

const PAGE_SIZE = 20

const STATUS_LABEL: Record<TenantStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  pending: 'Pending',
}

export default function AdminTenantsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | TenantStatus>('all')
  const [sort, setSort] = useState<'recent' | 'lastActive' | 'name'>('recent')
  const [data, setData] = useState<TenantsResponse | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAddTenant, setShowAddTenant] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(() => {
    setError('')
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sort,
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(search ? { search } : {}),
    })
    return adminFetchJson<TenantsResponse>(`/api/admin/tenants?${params.toString()}`)
      .then((d) => {
        setData(d)
        setSelected(new Set())
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tenants'))
  }, [search, page, statusFilter, sort])

  useEffect(() => {
    const timeout = setTimeout(load, 250)
    return () => clearTimeout(timeout)
  }, [load])

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!data) return
    setSelected((prev) => (prev.size === data.tenants.length ? new Set() : new Set(data.tenants.map((t) => t.id))))
  }

  const handleTenantAction = async (id: string, action: 'activate' | 'suspend' | 'reset') => {
    setBusyId(id)
    setNotice('')
    try {
      const res = await adminFetchJson<{ ok: boolean; resetLink?: string | null }>(`/api/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (action === 'reset') {
        setNotice(res.resetLink ? `Password reset link generated: ${res.resetLink}` : 'Password reset link generated.')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete tenant "${name}"? This permanently removes their account and cannot be undone.`)) return
    setBusyId(id)
    try {
      await adminFetchJson(`/api/admin/tenants/${id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenant')
    } finally {
      setBusyId(null)
    }
  }

  const handleBulk = async (action: 'activate' | 'suspend' | 'delete') => {
    if (selected.size === 0) return
    if (action === 'delete' && !confirm(`Delete ${selected.size} tenant(s)? This cannot be undone.`)) return
    setBulkBusy(true)
    try {
      await adminFetchJson('/api/admin/tenants/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed')
    } finally {
      setBulkBusy(false)
    }
  }

  const handleExport = async () => {
    const res = await adminFetch('/api/admin/export')
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

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

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={handleExport}>
              <i className="fa-solid fa-download"></i>
              Export
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddTenant(true)}>
              <i className="fa-solid fa-plus"></i>
              Add Tenant
            </button>
          </div>
        </div>

        <div className="report-stats-grid" style={{ marginBottom: 0 }}>
          <div className="report-stat-card">
            <div className="report-stat-header">
              <div className="report-stat-label">Total</div>
              <div className="report-stat-icon report-stat-icon-blue">
                <i className="fa-solid fa-store"></i>
              </div>
            </div>
            <div className="report-stat-value">{data?.counts.all ?? '—'}</div>
            <div className="report-stat-sub">All registered shops</div>
          </div>

          <div className="report-stat-card">
            <div className="report-stat-header">
              <div className="report-stat-label">Active</div>
              <div className="report-stat-icon report-stat-icon-green">
                <i className="fa-solid fa-check"></i>
              </div>
            </div>
            <div className="report-stat-value">{data?.counts.active ?? '—'}</div>
            <div className="report-stat-sub">Active accounts</div>
          </div>

          <div className="report-stat-card">
            <div className="report-stat-header">
              <div className="report-stat-label">Pending</div>
              <div className="report-stat-icon report-stat-icon-orange">
                <i className="fa-solid fa-hourglass-half"></i>
              </div>
            </div>
            <div className="report-stat-value">{data?.counts.pending ?? '—'}</div>
            <div className="report-stat-sub">Setup incomplete</div>
          </div>

          <div className="report-stat-card">
            <div className="report-stat-header">
              <div className="report-stat-label">Suspended</div>
              <div className="report-stat-icon report-stat-icon-orange">
                <i className="fa-solid fa-ban"></i>
              </div>
            </div>
            <div className="report-stat-value">{data?.counts.suspended ?? '—'}</div>
            <div className="report-stat-sub">Accounts under review</div>
          </div>
        </div>
      </div>

      <div className="admin-search">
        <input
          type="text"
          placeholder="Search by business name, owner, phone, or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'active', 'pending', 'suspended'] as const).map((filter) => (
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

        <select
          className="admin-sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          <option value="recent">Sort: Newest</option>
          <option value="lastActive">Sort: Last Active</option>
          <option value="name">Sort: Business Name</option>
        </select>
      </div>

      {notice && (
        <div className="admin-notice">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

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
          <p>No tenants found</p>
        </div>
      )}

      {data && data.tenants.length > 0 && (
        <div className="admin-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--muted)' }}>
              <input
                type="checkbox"
                checked={selected.size === data.tenants.length}
                onChange={toggleSelectAll}
              />
              Select all
            </label>
            {selected.size > 0 && (
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--muted)', alignSelf: 'center' }}>
                  {selected.size} selected
                </span>
                <button className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => handleBulk('activate')}>
                  Activate
                </button>
                <button className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => handleBulk('suspend')}>
                  Suspend
                </button>
                <button className="btn btn-danger btn-sm" disabled={bulkBusy} onClick={() => handleBulk('delete')}>
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="tenant-cards">
            {data.tenants.map((t) => (
              <div key={t.id} className="tenant-card">
                <div className="tenant-card-header">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleSelected(t.id)}
                      style={{ marginTop: 4 }}
                    />
                    <div>
                      <div className="tenant-card-title">{t.shopName || '(No business name)'}</div>
                      <div className="tenant-card-phone">{t.ownerName || 'Owner not set'}</div>
                    </div>
                  </div>
                  <span className={`tenant-status-badge ${t.status}`}>{STATUS_LABEL[t.status]}</span>
                </div>

                <div className="tenant-card-metrics">
                  <div className="tenant-metric">
                    <span className="tenant-metric-label">Phone</span>
                    <span className="tenant-metric-value">{t.phone || '—'}</span>
                  </div>
                  <div className="tenant-metric">
                    <span className="tenant-metric-label">Registered</span>
                    <span className="tenant-metric-value">{t.signupDate ? formatDate(t.signupDate.slice(0, 10)) : '—'}</span>
                  </div>
                  <div className="tenant-metric">
                    <span className="tenant-metric-label">Last Active</span>
                    <span className="tenant-metric-value">
                      {t.lastActive ? formatRelativeTime(t.lastActive) : '—'}
                    </span>
                  </div>
                </div>

                <div className="tenant-card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => router.push(`/admin/tenants/${t.id}`)}
                  >
                    View Profile
                  </button>
                  {t.status === 'suspended' ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === t.id}
                      onClick={() => handleTenantAction(t.id, 'activate')}
                    >
                      Activate
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === t.id}
                      onClick={() => handleTenantAction(t.id, 'suspend')}
                    >
                      Suspend
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={busyId === t.id}
                    onClick={() => handleTenantAction(t.id, 'reset')}
                  >
                    Reset Account
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={busyId === t.id}
                    onClick={() => handleDelete(t.id, t.shopName || t.email || 'this tenant')}
                  >
                    Delete
                  </button>
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

      {showAddTenant && (
        <AddTenantModal
          onClose={() => setShowAddTenant(false)}
          onCreated={(id) => {
            setShowAddTenant(false)
            load()
            router.push(`/admin/tenants/${id}`)
          }}
        />
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
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text);
        }

        .tenant-card-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .tenant-card-actions .btn {
          width: 100%;
          justify-content: center;
        }

        @media (min-width: 768px) {
          .tenant-card-actions {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
    </>
  )
}
