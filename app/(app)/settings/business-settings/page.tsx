'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { offlineWrite } from '@/lib/offline'
import { showToast } from '@/lib/toast'

export default function BusinessSettingsPage() {
  const [weeklyReportDay, setWeeklyReportDay] = useState('sunday')
  const [overdueThresholdDays, setOverdueThresholdDays] = useState(7)
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
        .select('weekly_report_day, overdue_strategy, overdue_threshold_days')
        .eq('id', user.id)
        .single()

      if (data) {
        if (data.weekly_report_day) setWeeklyReportDay(data.weekly_report_day)
        if (data.overdue_threshold_days) setOverdueThresholdDays(data.overdue_threshold_days)
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
          const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            weekly_report_day: weeklyReportDay,
            overdue_strategy: 'fixed_period',
            overdue_threshold_days: overdueThresholdDays,
          })
          if (error) throw error
          return { data: null, error: null }
        },
        {
          table: 'profiles',
          operation: 'upsert',
          data: {
            id: user.id,
            weekly_report_day: weeklyReportDay,
            overdue_strategy: 'fixed_period',
            overdue_threshold_days: overdueThresholdDays,
          },
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
            <label htmlFor="weeklyReportDay">Week ends on</label>
            <select
              id="weeklyReportDay"
              value={weeklyReportDay}
              onChange={(e) => setWeeklyReportDay(e.target.value)}
            >
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
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
              Customer is marked overdue if their last transaction is older than this many days.
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
