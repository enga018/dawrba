'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, isCustomerOverdue, type OverdueStrategy } from '@/lib/utils'

interface SummaryData {
  todayCredit: number
  collectedToday: number
  totalCredit: number
  totalCollection: number
  outstanding: number
  overdueCount: number
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function DashboardSummary() {
  const [data, setData] = useState<SummaryData | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user
        if (!user) return

        const { data: profileData } = await supabase
          .from('profiles')
          .select('overdue_strategy, overdue_threshold_days')
          .eq('id', user.id)
          .single()

        const strategy: OverdueStrategy = profileData?.overdue_strategy || 'fixed_period'
        const thresholdDays: number = profileData?.overdue_threshold_days || 7

        const { data: customers } = await supabase
          .from('customers')
          .select('id, opening_balance')
          .eq('user_id', user.id)

        const ids = (customers || []).map((c) => c.id)
        if (ids.length === 0) {
          setData({ todayCredit: 0, collectedToday: 0, totalCredit: 0, totalCollection: 0, outstanding: 0, overdueCount: 0 })
          return
        }

        const { data: txData } = await supabase
          .from('transactions')
          .select('customer_id, amount, date, created_at')
          .in('customer_id', ids)

        const todayStart = startOfDay(new Date()).getTime()
        let todayCredit = 0
        let collectedToday = 0
        let totalCredit = 0
        let totalCollection = 0
        const balances: Record<string, number> = {}
        const txByCustomer: Record<string, Array<{ amount: number; date?: string; created_at: string }>> = {}

        for (const t of txData || []) {
          const amount = t.amount || 0
          balances[t.customer_id] = (balances[t.customer_id] || 0) + amount
          if (!txByCustomer[t.customer_id]) txByCustomer[t.customer_id] = []
          txByCustomer[t.customer_id].push({ amount: t.amount, date: t.date, created_at: t.created_at })

          if (amount > 0) totalCredit += amount
          else totalCollection += Math.abs(amount)

          const ts = new Date(t.created_at).getTime()
          if (ts >= todayStart) {
            if (amount > 0) todayCredit += amount
            else collectedToday += Math.abs(amount)
          }
        }

        let outstanding = 0
        let overdueCount = 0
        for (const c of customers || []) {
          const balance = (c.opening_balance || 0) + (balances[c.id] || 0)
          if (balance > 0) {
            outstanding += balance
            if (isCustomerOverdue(balance, txByCustomer[c.id] || [], strategy, thresholdDays)) {
              overdueCount += 1
            }
          }
        }

        setData({ todayCredit, collectedToday, totalCredit, totalCollection, outstanding, overdueCount })
      } catch {
        // silent
      }
    }
    fetchSummary()
  }, [])

  if (!data) {
    return (
      <div className="dashboard-hero-skeleton">
        <div className="hero-skeleton" style={{ height: '180px', borderRadius: '24px' }} />
        <div className="summary-grid" style={{ marginTop: 16 }}>
          {[0, 1].map((i) => (
            <div key={i} className="summary-card">
              <div className="hero-skeleton" style={{ height: '80px' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const collectionRate = data.totalCredit > 0 ? Math.round((data.totalCollection / data.totalCredit) * 100) : 0

  return (
    <>
      <div className="dashboard-hero-card">
        <div className="dashboard-hero-top">
          <div>
            <div className="dashboard-hero-label">Total Outstanding</div>
            <div className="dashboard-hero-value">₹{formatCurrency(data.outstanding)}</div>
          </div>
          <div className="dashboard-hero-badge">Live</div>
        </div>

        <div className="dashboard-hero-bottom">
          <div className="dashboard-hero-stat">
            <span className="dashboard-hero-stat-label">Total Credit</span>
            <span className="dashboard-hero-stat-value" style={{ color: '#4ade80' }}>
              ₹{formatCurrency(data.totalCredit)}
            </span>
          </div>

          <div className="dashboard-hero-stat">
            <span className="dashboard-hero-stat-label">Total Collection</span>
            <span className="dashboard-hero-stat-value">₹{formatCurrency(data.totalCollection)}</span>
          </div>

          <div className="dashboard-hero-stat">
            <span className="dashboard-hero-stat-label">Collection Rate</span>
            <span className="dashboard-hero-stat-value">{collectionRate}%</span>
          </div>

          <div className="dashboard-hero-stat">
            <span className="dashboard-hero-stat-label">Overdue</span>
            <span className="dashboard-hero-stat-value">{data.overdueCount}</span>
          </div>
        </div>
      </div>

      <div className="summary-grid summary-grid-modern">
        <div className="summary-card-modern">
          <div className="summary-card-modern-header">
            <span className="summary-card-modern-label">Today Credit</span>
            <div className="summary-card-modern-icon green">
              <i className="fa-solid fa-plus"></i>
            </div>
          </div>
          <div className="summary-card-modern-value">₹{formatCurrency(data.todayCredit)}</div>
          <div className="summary-card-modern-sub">Added today</div>
        </div>

        <div className="summary-card-modern">
          <div className="summary-card-modern-header">
            <span className="summary-card-modern-label">Collected Today</span>
            <div className="summary-card-modern-icon blue">
              <i className="fa-solid fa-hand-holding-dollar"></i>
            </div>
          </div>
          <div className="summary-card-modern-value">₹{formatCurrency(data.collectedToday)}</div>
          <div className="summary-card-modern-sub">Received today</div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-hero-card {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          border-radius: 24px;
          padding: 24px;
          color: white;
          box-shadow: 0 18px 40px rgba(37, 99, 235, 0.22);
          margin-bottom: 18px;
        }

        .dashboard-hero-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 24px;
        }

        .dashboard-hero-label {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.82);
          margin-bottom: 8px;
        }

        .dashboard-hero-value {
          font-size: clamp(1.8rem, 5vw, 2.6rem);
          font-weight: 800;
          line-height: 1.1;
        }

        .dashboard-hero-badge {
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.24);
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          backdrop-filter: blur(8px);
        }

        .dashboard-hero-bottom {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px 20px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 18px;
          padding: 14px 16px;
          backdrop-filter: blur(8px);
        }

        .dashboard-hero-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dashboard-hero-stat-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.78);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .dashboard-hero-stat-value {
          font-size: 1.1rem;
          font-weight: 700;
        }

        .summary-grid-modern {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .summary-card-modern {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 18px;
          box-shadow: var(--shadow-sm);
        }

        .summary-card-modern-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .summary-card-modern-label {
          font-size: 0.82rem;
          color: var(--muted);
          font-weight: 600;
        }

        .summary-card-modern-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
        }

        .summary-card-modern-icon.green {
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
        }

        .summary-card-modern-icon.blue {
          background: rgba(37, 99, 235, 0.12);
          color: #2563eb;
        }

        .summary-card-modern-value {
          font-size: 1.45rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 6px;
          line-height: 1.1;
        }

        .summary-card-modern-sub {
          font-size: 0.78rem;
          color: var(--muted);
        }

        @media (max-width: 767px) {
          .dashboard-hero-card {
            padding: 20px;
            border-radius: 22px;
          }

          .dashboard-hero-bottom {
            gap: 12px 14px;
          }
        }
      `}</style>
    </>
  )
}
