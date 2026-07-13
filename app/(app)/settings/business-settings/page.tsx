'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { offlineWrite } from '@/lib/offline'
import { showToast } from '@/lib/toast'

export default function BusinessSettingsPage() {
  const [weeklyReportDay, setWeeklyReportDay] = useState('sunday')
  const [overdueThresholdDays, setOverdueThresholdDays] = useState(7)
  const [overdueResetThresholdPct, setOverdueResetThresholdPct] = useState(50)
  const [slowPayingRatioPct, setSlowPayingRatioPct] = useState(30)
  const [balanceRiseThreshold, setBalanceRiseThreshold] = useState(5000)
  const [largePaymentThreshold, setLargePaymentThreshold] = useState(5000)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const loadProfile = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('weekly_report_day, overdue_threshold_days, overdue_reset_threshold_pct, slow_paying_ratio_pct, balance_rise_threshold, large_payment_threshold')
        .eq('id', user.id)
        .single()

      if (data) {
        if (data.weekly_report_day) setWeeklyReportDay(data.weekly_report_day)
        if (data.overdue_threshold_days) setOverdueThresholdDays(data.overdue_threshold_days)
        if (data.overdue_reset_threshold_pct) setOverdueResetThresholdPct(data.overdue_reset_threshold_pct)
        if (data.slow_paying_ratio_pct) setSlowPayingRatioPct(data.slow_paying_ratio_pct)
        if (data.balance_rise_threshold) setBalanceRiseThreshold(data.balance_rise_threshold)
        if (data.large_payment_threshold) setLargePaymentThreshold(data.large_payment_threshold)
      }
      setLoading(false)
    }
    loadProfile()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')

      const result = await offlineWrite(
        async () => {
          const { error } = await supabase
            .from('profiles')
            .update({
              weekly_report_day: weeklyReportDay,
              overdue_threshold_days: overdueThresholdDays,
              overdue_reset_threshold_pct: overdueResetThresholdPct,
              slow_paying_ratio_pct: slowPayingRatioPct,
              balance_rise_threshold: balanceRiseThreshold,
              large_payment_threshold: largePaymentThreshold,
            })
            .eq('id', user.id)
          if (error) throw error
          return { data: null, error: null }
        },
        {
          table: 'profiles',
          operation: 'update',
          data: {
            weekly_report_day: weeklyReportDay,
            overdue_threshold_days: overdueThresholdDays,
            overdue_reset_threshold_pct: overdueResetThresholdPct,
            slow_paying_ratio_pct: slowPayingRatioPct,
            balance_rise_threshold: balanceRiseThreshold,
            large_payment_threshold: largePaymentThreshold,
          },
          filters: { id: user.id },
        }
      )
      if (result?.error) throw result.error
      showToast('Business settings saved')
      router.push('/settings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSave}>
        <div className="detail-card">
          <div className="field">
            <label htmlFor="weeklyReportDay">Week starts on</label>
            <select
              id="weeklyReportDay"
              value={weeklyReportDay}
              onChange={(e) => setWeeklyReportDay(e.target.value)}
            >
              <option value="sunday">Sunday</option>
              <option value="monday">Monday</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="overdueThresholdDays">Overdue grace period (days)</label>
            <input
              type="number"
              id="overdueThresholdDays"
              min="1"
              max="365"
              value={overdueThresholdDays}
              onChange={(e) => setOverdueThresholdDays(parseInt(e.target.value) || 7)}
            />
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '6px' }}>
              Customer is marked overdue if they&apos;ve owed money for longer than this many days.
            </div>
          </div>

          <div className="field">
            <label htmlFor="overdueResetThresholdPct">Payment reset threshold (%)</label>
            <input
              type="number"
              id="overdueResetThresholdPct"
              min="1"
              max="100"
              value={overdueResetThresholdPct}
              onChange={(e) => setOverdueResetThresholdPct(parseInt(e.target.value) || 50)}
            />
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '6px' }}>
              A payment covering at least this percentage of a customer&apos;s current balance resets the overdue clock. Smaller payments don&apos;t.
            </div>
          </div>

          <div className="field">
            <label htmlFor="slowPayingRatioPct">Slow-paying threshold (%)</label>
            <input
              type="number"
              id="slowPayingRatioPct"
              min="1"
              max="100"
              value={slowPayingRatioPct}
              onChange={(e) => setSlowPayingRatioPct(parseInt(e.target.value) || 30)}
            />
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '6px' }}>
              Flag a customer as slow-paying if they&apos;ve paid back less than this percentage of the credit given to them in the last 3 months.
            </div>
          </div>

          <div className="field">
            <label htmlFor="balanceRiseThreshold">Balance rise alert (₹/week)</label>
            <input
              type="number"
              id="balanceRiseThreshold"
              min="0"
              value={balanceRiseThreshold}
              onChange={(e) => setBalanceRiseThreshold(parseFloat(e.target.value) || 5000)}
            />
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '6px' }}>
              Alert when a customer&apos;s balance rises by more than this amount within a week.
            </div>
          </div>

          <div className="field">
            <label htmlFor="largePaymentThreshold">Large payment alert (₹)</label>
            <input
              type="number"
              id="largePaymentThreshold"
              min="0"
              value={largePaymentThreshold}
              onChange={(e) => setLargePaymentThreshold(parseFloat(e.target.value) || 5000)}
            />
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '6px' }}>
              Highlight payments of at least this amount as a notable insight.
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={saving} style={{ marginTop: '16px' }}>
          {saving ? <span className="spinner"></span> : 'Save Changes'}
        </button>
        {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
      </form>
    </>
  )
}
