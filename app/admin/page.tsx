'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { adminFetch, adminFetchJson } from '@/lib/adminApiClient'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import AddTenantModal from './AddTenantModal'

interface OverviewData {
  totalTenants: number
  totalCustomers: number
  activeTenantsToday: number
  signupsThisWeek: number
  registrationGrowth: { date: string; count: number }[]
  tenantHealth: { healthy: number; idle: number; issue: number }
  insights: { icon: string; iconColor: string; title: string; body: string }[]
  recentActivity: { id: string; shopName: string; timestamp: string; type: string }[]
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showAddTenant, setShowAddTenant] = useState(false)

  const load = useCallback(() => {
    return adminFetchJson<OverviewData>('/api/admin/overview')
      .then((d) => {
        setData(d)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load overview'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await adminFetch('/api/admin/export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to export report')
    } finally {
      setExporting(false)
    }
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

  const maxTrend = Math.max(1, ...data.registrationGrowth.map((d) => d.count))
  const healthTotal = Math.max(1, data.tenantHealth.healthy + data.tenantHealth.idle + data.tenantHealth.issue)

  return (
    <>
      <div className="report-stats-grid">
        <div className="report-stat-card">
          <div className="report-stat-header">
            <span className="report-stat-label">Total Tenants</span>
            <span className="report-stat-icon report-stat-icon-blue">
              <i className="fa-solid fa-store"></i>
            </span>
          </div>
          <div className="report-stat-value">{data.totalTenants}</div>
          <div className="report-stat-sub">All registered shops</div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-header">
            <span className="report-stat-label">Total Customers</span>
            <span className="report-stat-icon report-stat-icon-blue">
              <i className="fa-solid fa-users"></i>
            </span>
          </div>
          <div className="report-stat-value">{data.totalCustomers}</div>
          <div className="report-stat-sub">Across all tenants</div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-header">
            <span className="report-stat-label">Active Today</span>
            <span className="report-stat-icon report-stat-icon-green">
              <i className="fa-solid fa-bolt"></i>
            </span>
          </div>
          <div className="report-stat-value">{data.activeTenantsToday}</div>
          <div className="report-stat-sub">Tenants active today</div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-header">
            <span className="report-stat-label">New Signups</span>
            <span className="report-stat-icon report-stat-icon-orange">
              <i className="fa-solid fa-user-plus"></i>
            </span>
          </div>
          <div className="report-stat-value">{data.signupsThisWeek}</div>
          <div className="report-stat-sub">This week</div>
        </div>
      </div>

      <div className="admin-section">
        <h3 className="admin-section-title">Registration Growth — last 30 days</h3>
        <div className="admin-trend-bars">
          {data.registrationGrowth.map((d) => (
            <div className="admin-trend-bar-col" key={d.date}>
              <div
                className={`admin-trend-bar ${d.count > 0 ? 'has-value' : ''}`}
                style={{ height: `${Math.max(4, (d.count / maxTrend) * 100)}%` }}
                title={`${formatDate(d.date)}: ${d.count}`}
              ></div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <h3 className="admin-section-title">Tenant Health Summary</h3>
        <div className="tenant-health-grid">
          <div className="tenant-health-item">
            <div className="tenant-health-dot healthy"></div>
            <div>
              <div className="tenant-health-value">{data.tenantHealth.healthy}</div>
              <div className="tenant-health-label">Healthy</div>
            </div>
          </div>
          <div className="tenant-health-item">
            <div className="tenant-health-dot idle"></div>
            <div>
              <div className="tenant-health-value">{data.tenantHealth.idle}</div>
              <div className="tenant-health-label">Idle</div>
            </div>
          </div>
          <div className="tenant-health-item">
            <div className="tenant-health-dot issue"></div>
            <div>
              <div className="tenant-health-value">{data.tenantHealth.issue}</div>
              <div className="tenant-health-label">Issue</div>
            </div>
          </div>
        </div>
        <div className="tenant-health-bar">
          <div className="tenant-health-bar-seg healthy" style={{ width: `${(data.tenantHealth.healthy / healthTotal) * 100}%` }}></div>
          <div className="tenant-health-bar-seg idle" style={{ width: `${(data.tenantHealth.idle / healthTotal) * 100}%` }}></div>
          <div className="tenant-health-bar-seg issue" style={{ width: `${(data.tenantHealth.issue / healthTotal) * 100}%` }}></div>
        </div>
      </div>

      <div className="admin-section">
        <h3 className="admin-section-title">Quick Actions</h3>
        <div className="quick-actions-grid">
          <button className="quick-action-btn" onClick={() => setShowAddTenant(true)}>
            <i className="fa-solid fa-plus"></i>
            <span>Add Tenant</span>
          </button>
          <button className="quick-action-btn" onClick={handleExport} disabled={exporting}>
            <i className={`fa-solid ${exporting ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
            <span>Export Report</span>
          </button>
          <button className="quick-action-btn" onClick={handleRefresh} disabled={refreshing}>
            <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'fa-spin' : ''}`}></i>
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {data.insights.length > 0 && (
        <div className="admin-section">
          <h3 className="admin-section-title">Platform Insights</h3>
          <div className="insight-list">
            {data.insights.map((insight, i) => (
              <div className="insight-item" key={i}>
                <div className={`insight-icon ${insight.iconColor}`}>
                  <i className={`fa-solid ${insight.icon}`}></i>
                </div>
                <div className="insight-text">
                  <div className="insight-title">{insight.title}</div>
                  <div className="insight-body">{insight.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-section">
        <h3 className="admin-section-title">Recent Activity</h3>
        {data.recentActivity.length === 0 ? (
          <div className="empty" style={{ padding: '20px' }}>
            <i className="fa-solid fa-clock"></i>
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="recent-activity-list">
            {data.recentActivity.map((a) => (
              <Link href={`/admin/tenants/${a.id}`} className="recent-activity-item" key={a.id}>
                <div className="recent-activity-icon">
                  <i className="fa-solid fa-store"></i>
                </div>
                <div className="recent-activity-text">
                  <span className="recent-activity-name">{a.shopName}</span> signed up
                </div>
                <div className="recent-activity-time">{formatRelativeTime(a.timestamp)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

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
        .tenant-health-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .tenant-health-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tenant-health-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .tenant-health-dot.healthy,
        .tenant-health-bar-seg.healthy {
          background: var(--green);
        }

        .tenant-health-dot.idle,
        .tenant-health-bar-seg.idle {
          background: var(--orange);
        }

        .tenant-health-dot.issue,
        .tenant-health-bar-seg.issue {
          background: var(--red);
        }

        .tenant-health-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
        }

        .tenant-health-label {
          font-size: 0.75rem;
          color: var(--muted);
        }

        .tenant-health-bar {
          display: flex;
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: var(--border);
        }

        @media (min-width: 640px) {
          .quick-actions-grid {
            max-width: 480px;
          }
        }
      `}</style>
    </>
  )
}
