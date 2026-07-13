'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch, adminFetchJson } from '@/lib/adminApiClient'
import { formatDate, formatRelativeTime } from '@/lib/utils'

interface ActivityData {
  needsAttention: {
    inactiveTenants: { id: string; shopName: string; lastActive: string | null }[]
    unverifiedAccounts: { id: string; shopName: string; email: string | null; signupDate: string | null }[]
    loginIssues: { id: string; shopName: string; signupDate: string | null }[]
  }
  newRegistrations: {
    newTenants: { id: string; shopName: string; signupDate: string | null }[]
    customerGrowthCount: number
  }
  systemEvents: { label: string; status: 'ok' | 'off'; detail: string }[]
  usageSummary: { totalTenants: number; totalCustomers: number; activeToday: number; newThisWeek: number }
}

export default function AdminActivityPage() {
  const [data, setData] = useState<ActivityData | null>(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  useEffect(() => {
    adminFetchJson<ActivityData>('/api/admin/activity')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load activity'))
  }, [])

  const handleExportCsv = async () => {
    setExporting('csv')
    try {
      const res = await adminFetch('/api/admin/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to export CSV')
    } finally {
      setExporting(null)
    }
  }

  const handleExportPdf = () => {
    if (!data) return
    setExporting('pdf')
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(`
        <html>
          <head><title>DawrBa Usage Summary</title></head>
          <body style="font-family: sans-serif; padding: 32px;">
            <h1>DawrBa Platform Usage Summary</h1>
            <p>Generated ${new Date().toLocaleString('en-IN')}</p>
            <ul>
              <li>Total Tenants: ${data.usageSummary.totalTenants}</li>
              <li>Total Customers: ${data.usageSummary.totalCustomers}</li>
              <li>Active Today: ${data.usageSummary.activeToday}</li>
              <li>New Tenants This Week: ${data.usageSummary.newThisWeek}</li>
            </ul>
          </body>
        </html>
      `)
      win.document.close()
      win.focus()
      win.print()
    }
    setExporting(null)
  }

  if (error) {
    return (
      <div className="empty">
        <i className="fa-solid fa-triangle-exclamation"></i>
        <p>{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--blue)', margin: '0 auto' }}></div>
      </div>
    )
  }

  const hasAttentionItems =
    data.needsAttention.inactiveTenants.length > 0 ||
    data.needsAttention.unverifiedAccounts.length > 0 ||
    data.needsAttention.loginIssues.length > 0

  return (
    <>
      <div className="admin-section">
        <h3 className="admin-section-title">Needs Attention</h3>
        {!hasAttentionItems ? (
          <div className="empty" style={{ padding: '20px' }}>
            <i className="fa-solid fa-circle-check" style={{ color: 'var(--green)' }}></i>
            <p>Nothing needs attention right now</p>
          </div>
        ) : (
          <div className="insight-list">
            {data.needsAttention.inactiveTenants.map((t) => (
              <Link key={t.id} href={`/admin/tenants/${t.id}`} className="insight-item">
                <div className="insight-icon orange">
                  <i className="fa-solid fa-moon"></i>
                </div>
                <div className="insight-text">
                  <div className="insight-title">Inactive Tenant</div>
                  <div className="insight-body">{t.shopName}</div>
                  <div className="insight-sub">{t.lastActive ? `Last active ${formatRelativeTime(t.lastActive)}` : 'Never active'}</div>
                </div>
              </Link>
            ))}
            {data.needsAttention.unverifiedAccounts.map((t) => (
              <Link key={t.id} href={`/admin/tenants/${t.id}`} className="insight-item">
                <div className="insight-icon orange">
                  <i className="fa-solid fa-envelope-circle-check"></i>
                </div>
                <div className="insight-text">
                  <div className="insight-title">Unverified Account</div>
                  <div className="insight-body">{t.shopName}</div>
                  <div className="insight-sub">{t.email}</div>
                </div>
              </Link>
            ))}
            {data.needsAttention.loginIssues.map((t) => (
              <Link key={t.id} href={`/admin/tenants/${t.id}`} className="insight-item">
                <div className="insight-icon red">
                  <i className="fa-solid fa-right-to-bracket"></i>
                </div>
                <div className="insight-text">
                  <div className="insight-title">Login Issue</div>
                  <div className="insight-body">{t.shopName}</div>
                  <div className="insight-sub">Never logged in since signing up {formatDate(t.signupDate?.slice(0, 10))}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="admin-section">
        <h3 className="admin-section-title">New Registrations</h3>
        <div className="report-stats-grid" style={{ marginBottom: 14 }}>
          <div className="report-stat-card">
            <div className="report-stat-header">
              <span className="report-stat-label">New Tenants</span>
              <span className="report-stat-icon report-stat-icon-blue">
                <i className="fa-solid fa-store"></i>
              </span>
            </div>
            <div className="report-stat-value">{data.newRegistrations.newTenants.length}</div>
            <div className="report-stat-sub">Last 7 days</div>
          </div>
          <div className="report-stat-card">
            <div className="report-stat-header">
              <span className="report-stat-label">Customer Growth</span>
              <span className="report-stat-icon report-stat-icon-green">
                <i className="fa-solid fa-users"></i>
              </span>
            </div>
            <div className="report-stat-value">{data.newRegistrations.customerGrowthCount}</div>
            <div className="report-stat-sub">New customers, last 7 days</div>
          </div>
        </div>
        {data.newRegistrations.newTenants.length > 0 && (
          <div className="recent-activity-list">
            {data.newRegistrations.newTenants.map((t) => (
              <Link href={`/admin/tenants/${t.id}`} className="recent-activity-item" key={t.id}>
                <div className="recent-activity-icon">
                  <i className="fa-solid fa-store"></i>
                </div>
                <div className="recent-activity-text">
                  <span className="recent-activity-name">{t.shopName}</span> signed up
                </div>
                <div className="recent-activity-time">{t.signupDate ? formatRelativeTime(t.signupDate) : ''}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="admin-section">
        <h3 className="admin-section-title">System Events</h3>
        <div className="system-events-list">
          {data.systemEvents.map((e) => (
            <div className="system-event-row" key={e.label}>
              <span className={`system-event-dot ${e.status}`}></span>
              <div className="system-event-text">
                <div className="system-event-label">{e.label}</div>
                <div className="system-event-detail">{e.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <h3 className="admin-section-title">Reports &amp; Exports</h3>
        <div className="quick-actions-grid">
          <button className="quick-action-btn" onClick={handleExportCsv} disabled={exporting === 'csv'}>
            <i className={`fa-solid ${exporting === 'csv' ? 'fa-spinner fa-spin' : 'fa-file-csv'}`}></i>
            <span>Export CSV</span>
          </button>
          <button className="quick-action-btn" onClick={handleExportPdf} disabled={exporting === 'pdf'}>
            <i className={`fa-solid ${exporting === 'pdf' ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
            <span>Export PDF</span>
          </button>
        </div>
        <div className="usage-summary">
          <div className="usage-summary-item">
            <span>Total Tenants</span>
            <strong>{data.usageSummary.totalTenants}</strong>
          </div>
          <div className="usage-summary-item">
            <span>Total Customers</span>
            <strong>{data.usageSummary.totalCustomers}</strong>
          </div>
          <div className="usage-summary-item">
            <span>Active Today</span>
            <strong>{data.usageSummary.activeToday}</strong>
          </div>
          <div className="usage-summary-item">
            <span>New This Week</span>
            <strong>{data.usageSummary.newThisWeek}</strong>
          </div>
        </div>
      </div>

      <style jsx>{`
        .quick-actions-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-bottom: 16px;
          max-width: 340px;
        }

        .usage-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .usage-summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--surface-alt);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 0.85rem;
          color: var(--muted);
        }

        .usage-summary-item strong {
          color: var(--text);
          font-size: 0.95rem;
        }

        .system-events-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .system-event-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .system-event-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .system-event-dot.ok {
          background: var(--green);
        }

        .system-event-dot.off {
          background: var(--muted);
        }

        .system-event-label {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text);
        }

        .system-event-detail {
          font-size: 0.8rem;
          color: var(--muted);
        }
      `}</style>
    </>
  )
}
