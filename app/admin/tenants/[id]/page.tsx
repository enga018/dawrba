'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminFetchJson } from '@/lib/adminApiClient'
import { formatDate, formatTimestampDate, formatRelativeTime } from '@/lib/utils'

type TenantStatus = 'active' | 'suspended' | 'pending'

interface TenantCustomer {
  id: string
  name: string
  phone: string | null
  created_at: string
}

interface TenantDetail {
  profile: {
    id: string
    email: string | null
    signupDate: string | null
    lastSignInAt: string | null
    emailConfirmed: boolean
    shopName: string | null
    ownerName: string | null
    phone: string | null
    status: TenantStatus
  }
  customers: TenantCustomer[]
}

const STATUS_LABEL: Record<TenantStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  pending: 'Pending',
}

export default function AdminTenantDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<TenantDetail | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(() => {
    if (!params?.id) return
    return adminFetchJson<TenantDetail>(`/api/admin/tenants/${params.id}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tenant'))
  }, [params?.id])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (action: 'activate' | 'suspend' | 'reset') => {
    if (!params?.id) return
    setBusy(true)
    setNotice('')
    try {
      const res = await adminFetchJson<{ ok: boolean; resetLink?: string | null }>(`/api/admin/tenants/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (action === 'reset') {
        setNotice(res.resetLink ? `Password reset link: ${res.resetLink}` : 'Password reset link generated.')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!params?.id || !data) return
    if (!confirm(`Delete tenant "${data.profile.shopName || data.profile.email}"? This permanently removes their account and cannot be undone.`)) return
    setBusy(true)
    try {
      await adminFetchJson(`/api/admin/tenants/${params.id}`, { method: 'DELETE' })
      router.push('/admin/tenants')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenant')
      setBusy(false)
    }
  }

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
          <div className="admin-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <h2>{data.profile.shopName || '(No business name)'}</h2>
            <span className={`tenant-status-badge ${data.profile.status}`}>
              {STATUS_LABEL[data.profile.status]}
            </span>
          </div>
          <div className="admin-detail-meta">
            <span>{data.profile.ownerName || 'Owner not set'}</span>
            <span>{data.profile.phone || 'No phone'}</span>
            <span>{data.profile.email || 'No email'}</span>
            <span>Registered {formatDate(data.profile.signupDate?.slice(0, 10))}</span>
            <span>Last active {data.profile.lastSignInAt ? formatRelativeTime(data.profile.lastSignInAt) : 'Never'}</span>
            {!data.profile.emailConfirmed && <span style={{ color: 'var(--orange)' }}>Email unverified</span>}
          </div>

          {notice && (
            <div className="admin-notice" style={{ marginBottom: 16 }}>
              <span>{notice}</span>
              <button onClick={() => setNotice('')} aria-label="Dismiss">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

          <div className="admin-section">
            <h3 className="admin-section-title">Account Actions</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {data.profile.status === 'suspended' ? (
                <button className="btn btn-secondary" disabled={busy} onClick={() => handleAction('activate')}>
                  Activate Tenant
                </button>
              ) : (
                <button className="btn btn-secondary" disabled={busy} onClick={() => handleAction('suspend')}>
                  Suspend Tenant
                </button>
              )}
              <button className="btn btn-secondary" disabled={busy} onClick={() => handleAction('reset')}>
                Reset Account
              </button>
              <button className="btn btn-danger" disabled={busy} onClick={handleDelete}>
                Delete Tenant
              </button>
            </div>
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
                      <th>Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.phone || '—'}</td>
                        <td>{formatTimestampDate(c.created_at)}</td>
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
