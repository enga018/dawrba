'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { loadReportData, type ReportData, type Schedule } from '@/lib/reports'
import { formatCurrency, formatTime, formatTimestampDate } from '@/lib/utils'

type Period = 'daily' | 'weekly' | 'monthly'

function timeLabel(time: string): string {
  return formatTime(`2000-01-01T${time}`)
}

function completeAtLabel(date: Date): string {
  return `${formatTimestampDate(date.toISOString())}, ${formatTime(date.toISOString())}`
}

function TrendRow({ value }: { value?: number }) {
  if (value === undefined) return null
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '4px',
        fontSize: '0.76rem',
        fontWeight: 600,
        color: value > 0 ? 'var(--green)' : value < 0 ? 'var(--red)' : 'var(--meta)',
      }}
    >
      <i className={`fa-solid ${value > 0 ? 'fa-arrow-up' : value < 0 ? 'fa-arrow-down' : 'fa-minus'}`}></i>
      <span>{Math.abs(value)}%</span>
    </div>
  )
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('daily')
  const [data, setData] = useState<ReportData | null>(null)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const triggeredRef = useRef<Set<string>>(new Set())

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
        .select('daily_report_time, weekly_report_day, weekly_report_time, monthly_report_time')
        .eq('id', user.id)
        .single()

      const sched: Schedule = {
        dailyTime: profile?.daily_report_time?.slice(0, 5) || '21:00',
        weeklyDay: profile?.weekly_report_day || 'sunday',
        weeklyTime: profile?.weekly_report_time?.slice(0, 5) || '21:00',
        monthlyTime: profile?.monthly_report_time?.slice(0, 5) || '21:00',
      }
      setSchedule(sched)

      await load(sched)
      setLoading(false)
    }
    init()
  }, [router, load])

  // If the page is left open, refetch once the current time crosses a
  // scheduled report time -- no backend job, just keeps an open tab fresh.
  useEffect(() => {
    if (!schedule) return

    const checkSchedule = () => {
      const now = new Date()
      const hhmm = now.toTimeString().slice(0, 5)
      const dateKey = now.toISOString().slice(0, 10)
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

      if (schedule.dailyTime === hhmm) {
        const key = `daily-${dateKey}`
        if (!triggeredRef.current.has(key)) {
          triggeredRef.current.add(key)
          load(schedule)
        }
      }
      if (schedule.weeklyTime === hhmm && dayName === schedule.weeklyDay) {
        const key = `weekly-${dateKey}`
        if (!triggeredRef.current.has(key)) {
          triggeredRef.current.add(key)
          load(schedule)
        }
      }
      const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate()
      if (schedule.monthlyTime === hhmm && isLastDayOfMonth) {
        const key = `monthly-${dateKey}`
        if (!triggeredRef.current.has(key)) {
          triggeredRef.current.add(key)
          load(schedule)
        }
      }
    }

    const interval = setInterval(checkSchedule, 60000)
    return () => clearInterval(interval)
  }, [schedule, load])

  if (loading || !data || !schedule) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  const view =
    period === 'daily'
      ? {
          totals: data.daily,
          trend: data.dailyTrend,
          complete: data.dailyComplete,
          completeAt: data.dailyCompleteAt,
          label: 'Today',
          vs: 'vs yesterday',
        }
      : period === 'weekly'
        ? {
            totals: data.weekly,
            trend: data.weeklyTrend,
            complete: data.weeklyComplete,
            completeAt: data.weeklyCompleteAt,
            label: 'This week',
            vs: 'vs previous week',
          }
        : {
            totals: data.monthly,
            trend: data.monthlyTrend,
            complete: data.monthlyComplete,
            completeAt: data.monthlyCompleteAt,
            label: 'This month',
            vs: 'vs last month',
          }

  const scheduleLabel =
    period === 'daily'
      ? `Updates daily around ${timeLabel(schedule.dailyTime)}`
      : period === 'weekly'
        ? `Updates every ${schedule.weeklyDay === 'saturday' ? 'Saturday' : 'Sunday'} around ${timeLabel(schedule.weeklyTime)}`
        : `Updates on the last day of the month around ${timeLabel(schedule.monthlyTime)}`

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

      <div className="detail-card">
        <div style={{ fontSize: '0.85rem', color: 'var(--meta)', marginBottom: '4px' }}>
          {view.label}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--meta)', marginBottom: '12px' }}>
          {scheduleLabel}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: 'var(--tint-red)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--meta)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Credit Given
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--red)' }}>
              ₹{formatCurrency(view.totals.credit)}
            </div>
            <TrendRow value={view.trend.credit} />
          </div>
          <div style={{ background: 'var(--tint-green)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--meta)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Collected
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--green)' }}>
              ₹{formatCurrency(view.totals.collected)}
            </div>
            <TrendRow value={view.trend.collected} />
          </div>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--meta)', marginTop: '10px' }}>
          {view.totals.count} transaction{view.totals.count === 1 ? '' : 's'} so far
        </div>
        {!view.complete && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              marginTop: '10px',
              padding: '8px 10px',
              borderRadius: '10px',
              background: 'var(--surface-alt)',
              fontSize: '0.72rem',
              color: 'var(--muted)',
            }}
          >
            <i className="fa-solid fa-clock" style={{ marginTop: '2px' }}></i>
            <span>
              This period isn&apos;t complete yet, so the {view.vs} comparison is hidden. Complete
              data available after {completeAtLabel(view.completeAt)}.
            </span>
          </div>
        )}
      </div>

      {(view.totals.largestCredit || view.totals.largestCollection) && (
        <>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '20px 0 8px' }}>
            Largest Single Transaction
          </h3>
          <div className="tx-list">
            {view.totals.largestCredit && (
              <Link
                href={`/customers/${view.totals.largestCredit.customerId}`}
                className="tx-item"
                style={{ textDecoration: 'none' }}
              >
                <div className="tx-left">
                  <div className="tx-icon credit">
                    <i className="fa-solid fa-plus"></i>
                  </div>
                  <div>
                    <div className="tx-note">{view.totals.largestCredit.customerName}</div>
                    <div className="tx-date">Largest credit given</div>
                  </div>
                </div>
                <div className="tx-amount credit">
                  +₹{formatCurrency(view.totals.largestCredit.amount)}
                </div>
              </Link>
            )}
            {view.totals.largestCollection && (
              <Link
                href={`/customers/${view.totals.largestCollection.customerId}`}
                className="tx-item"
                style={{ textDecoration: 'none' }}
              >
                <div className="tx-left">
                  <div className="tx-icon pay">
                    <i className="fa-solid fa-minus"></i>
                  </div>
                  <div>
                    <div className="tx-note">{view.totals.largestCollection.customerName}</div>
                    <div className="tx-date">Largest collection</div>
                  </div>
                </div>
                <div className="tx-amount pay">
                  -₹{formatCurrency(view.totals.largestCollection.amount)}
                </div>
              </Link>
            )}
          </div>
        </>
      )}
    </>
  )
}
