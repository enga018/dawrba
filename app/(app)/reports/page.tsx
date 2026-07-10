'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { loadReportData, type ReportData } from '@/lib/reports'
import { formatCurrency, formatTime } from '@/lib/utils'

type Period = 'daily' | 'weekly' | 'monthly'

interface Schedule {
  dailyTime: string
  weeklyDay: string
  weeklyTime: string
  monthlyTime: string
}

function timeLabel(time: string): string {
  return formatTime(`2000-01-01T${time}`)
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

  const load = useCallback(async () => {
    const report = await loadReportData()
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

      if (profile) {
        setSchedule({
          dailyTime: profile.daily_report_time,
          weeklyDay: profile.weekly_report_day,
          weeklyTime: profile.weekly_report_time,
          monthlyTime: profile.monthly_report_time,
        })
      }

      await load()
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

      if (schedule.dailyTime.slice(0, 5) === hhmm) {
        const key = `daily-${dateKey}`
        if (!triggeredRef.current.has(key)) {
          triggeredRef.current.add(key)
          load()
        }
      }
      if (schedule.weeklyTime.slice(0, 5) === hhmm && dayName === schedule.weeklyDay) {
        const key = `weekly-${dateKey}`
        if (!triggeredRef.current.has(key)) {
          triggeredRef.current.add(key)
          load()
        }
      }
      const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate()
      if (schedule.monthlyTime.slice(0, 5) === hhmm && isLastDayOfMonth) {
        const key = `monthly-${dateKey}`
        if (!triggeredRef.current.has(key)) {
          triggeredRef.current.add(key)
          load()
        }
      }
    }

    const interval = setInterval(checkSchedule, 60000)
    return () => clearInterval(interval)
  }, [schedule, load])

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  const view =
    period === 'daily'
      ? { totals: data.daily, trend: data.dailyTrend, label: 'Today', vs: 'vs yesterday' }
      : period === 'weekly'
        ? { totals: data.weekly, trend: data.weeklyTrend, label: 'Last 7 days', vs: 'vs previous 7 days' }
        : { totals: data.monthly, trend: data.monthlyTrend, label: 'This month', vs: 'vs last month' }

  const scheduleLabel = !schedule
    ? ''
    : period === 'daily'
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
          <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--meta)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Credit Given
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--red)' }}>
              ₹{formatCurrency(view.totals.credit)}
            </div>
            <TrendRow value={view.trend.credit} />
          </div>
          <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '14px' }}>
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
          {view.vs} · {view.totals.count} transaction{view.totals.count === 1 ? '' : 's'}
        </div>
      </div>
    </>
  )
}
