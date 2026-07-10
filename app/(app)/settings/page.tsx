'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { showToast } from '@/lib/toast'

export default function SettingsPage() {
  const [shopName, setShopName] = useState('')
  const [email, setEmail] = useState('')
  const [reportTime, setReportTime] = useState('21:00')
  const [weeklyReportDay, setWeeklyReportDay] = useState('sunday')
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
      setEmail(user.email || '')

      const { data } = await supabase
        .from('profiles')
        .select('shop_name, report_time, weekly_report_day')
        .eq('id', user.id)
        .single()

      if (data?.shop_name) {
        setShopName(data.shop_name)
      }
      if (data?.report_time) setReportTime(data.report_time.slice(0, 5))
      if (data?.weekly_report_day) setWeeklyReportDay(data.weekly_report_day)
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

      const { error: dbError } = await supabase.from('profiles').upsert({
        id: user.id,
        shop_name: shopName,
        report_time: reportTime,
        weekly_report_day: weeklyReportDay,
      })

      if (dbError) throw dbError
      showToast('Settings saved')
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
      <Link href="/">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Settings</h2>
        </div>
      </Link>

      <div className="detail-card">
        <form onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="shopName">Shop name</label>
            <input
              type="text"
              id="shopName"
              placeholder="e.g. Shahid's Tea Stall"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              disabled
              style={{ background: 'var(--surface-alt)', color: 'var(--meta)' }}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? <span className="spinner"></span> : 'Save Settings'}
          </button>
          {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
        </form>
      </div>

      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '24px 0 12px' }}>
        Report Schedule
      </h3>
      <div className="detail-card">
        <form onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="reportTime">Report time</label>
            <input
              type="time"
              id="reportTime"
              value={reportTime}
              onChange={(e) => setReportTime(e.target.value)}
              required
            />
          </div>

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

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? <span className="spinner"></span> : 'Save Settings'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '24px' }}>
        <button className="btn btn-secondary btn-block" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket"></i> Sign Out
        </button>
      </div>
    </>
  )
}
