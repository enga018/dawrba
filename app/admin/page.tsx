'use client'

import { useEffect, useState } from 'react'
import { adminFetchJson } from '@/lib/adminApiClient'
import { formatCurrency, formatDate } from '@/lib/utils'

interface OverviewData {
  totalShopOwners: number
  totalCustomers: number
  totalTransactionVolume: number
  signupsThisWeek: number
  signupTrend: { date: string; count: number }[]
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetchJson<OverviewData>('/api/admin/overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load overview'))
  }, [])

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

  const maxTrend = Math.max(1, ...data.signupTrend.map((d) => d.count))

  return (
    <>
      <div className="report-stats-grid">
        <div className="report-stat-card">
          <div className="report-stat-header">
            <span className="report-stat-label">Shop Owners</span>
            <span className="report-stat-icon report-stat-icon-blue">
              <i className="fa-solid fa-store"></i>
            </span>
          </div>
          <div className="report-stat-value">{data.totalShopOwners}</div>
          <div className="report-stat-sub">Total signups</div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-header">
            <span className="report-stat-label">Customers</span>
            <span className="report-stat-icon report-stat-icon-blue">
              <i className="fa-solid fa-users"></i>
            </span>
          </div>
          <div className="report-stat-value">{data.totalCustomers}</div>
          <div className="report-stat-sub">Across all shops</div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-header">
            <span className="report-stat-label">Transaction Volume</span>
            <span className="report-stat-icon report-stat-icon-green">
              <i className="fa-solid fa-arrow-right-arrow-left"></i>
            </span>
          </div>
          <div className="report-stat-value">Rs.{formatCurrency(data.totalTransactionVolume)}</div>
          <div className="report-stat-sub">Total movement</div>
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
        <h3 className="admin-section-title">Signups — last 14 days</h3>
        <div className="admin-trend-bars">
          {data.signupTrend.map((d) => (
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
    </>
  )
}
