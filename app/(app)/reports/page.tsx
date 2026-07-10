'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { loadReportData, type ReportData, type Schedule } from '@/lib/reports'
import { formatCurrency } from '@/lib/utils'

type Period = 'daily' | 'weekly' | 'monthly'

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('daily')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const load = useCallback(async (sched: Schedule) => {
    const report = await loadReportData(sched)
    setData(report)
  }, [])

  useEffect(() => {
    const init = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('weekly_report_day')
        .eq('id', user.id)
        .single()

      // Reports run on the user's chosen week-end day, at midnight.
      const sched: Schedule = {
        time: '00:00',
        weeklyDay: profile?.weekly_report_day || 'sunday',
      }

      await load(sched)
      setLoading(false)
    }
    init()
  }, [router, load])

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  const totals =
    period === 'daily' ? data.daily : period === 'weekly' ? data.weekly : data.monthly

  const periodLabel = period === 'daily' ? 'today' : period === 'weekly' ? 'this week' : 'this month'

  return (
    <>
      <Link href="/">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Reports</h2>
        </div>
      </Link>

      <div className="toolbar" style={{ marginBottom: '14px' }}>
        {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
          <button
            key={p}
            className={period === p ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            style={{ flex: 1 }}
            onClick={() => setPeriod(p)}
          >
            {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>

      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '4px 0 8px' }}>
        Largest Single Transaction
      </h3>
      {totals.largestCredit || totals.largestCollection ? (
        <div className="tx-list">
          {totals.largestCredit && (
            <Link
              href={`/customers/${totals.largestCredit.customerId}`}
              className="tx-item"
              style={{ textDecoration: 'none' }}
            >
              <div className="tx-left">
                <div className="tx-icon credit">
                  <i className="fa-solid fa-plus"></i>
                </div>
                <div>
                  <div className="tx-note">{totals.largestCredit.customerName}</div>
                  <div className="tx-date">Largest credit given</div>
                </div>
              </div>
              <div className="tx-amount credit">
                +₹{formatCurrency(totals.largestCredit.amount)}
              </div>
            </Link>
          )}
          {totals.largestCollection && (
            <Link
              href={`/customers/${totals.largestCollection.customerId}`}
              className="tx-item"
              style={{ textDecoration: 'none' }}
            >
              <div className="tx-left">
                <div className="tx-icon pay">
                  <i className="fa-solid fa-minus"></i>
                </div>
                <div>
                  <div className="tx-note">{totals.largestCollection.customerName}</div>
                  <div className="tx-date">Largest collection</div>
                </div>
              </div>
              <div className="tx-amount pay">
                -₹{formatCurrency(totals.largestCollection.amount)}
              </div>
            </Link>
          )}
        </div>
      ) : (
        <div className="empty">
          <p>No transactions {periodLabel} yet.</p>
        </div>
      )}
    </>
  )
}
