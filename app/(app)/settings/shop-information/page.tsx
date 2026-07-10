'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/lib/toast'
import type { OverdueStrategy } from '@/lib/utils'

export default function ShopInformationPage() {
  const [shopName, setShopName] = useState('')
  const [phone, setPhone] = useState('')
  const [weeklyReportDay, setWeeklyReportDay] = useState('sunday')
  const [overdueStrategy, setOverdueStrategy] = useState<OverdueStrategy>('oldest_credit')
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
        .select('shop_name, phone, weekly_report_day, overdue_strategy, overdue_threshold_days')
        .eq('id', user.id)
        .single()

      if (data) {
        if (data.shop_name) setShopName(data.shop_name)
        if (data.phone) setPhone(data.phone)
        if (data.weekly_report_day) setWeeklyReportDay(data.weekly_report_day)
        if (data.overdue_strategy) setOverdueStrategy(data.overdue_strategy)
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

      const { error: dbError } = await supabase.from('profiles').upsert({
        id: user.id,
        shop_name: shopName,
        phone: phone || null,
        report_time: '00:00',
        weekly_report_day: weeklyReportDay,
        overdue_strategy: overdueStrategy,
        overdue_threshold_days: overdueThresholdDays,
      })

      if (dbError) throw dbError
      showToast('Shop information saved')
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
      <Link href="/settings">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Shop Information</h2>
        </div>
      </Link>

      <form onSubmit={handleSave}>
        <div className="detail-card">
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
            <label htmlFor="phone">Phone number</label>
            <input
              type="tel"
              id="phone"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
        </div>

        <div className="detail-card" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--orange)' }}></i>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Overdue Strategy</span>
          </div>

          <div className="field">
            <label htmlFor="overdueStrategy">Calculate overdue by</label>
            <select
              id="overdueStrategy"
              value={overdueStrategy}
              onChange={(e) => setOverdueStrategy(e.target.value as OverdueStrategy)}
            >
              <option value="oldest_credit">Oldest unpaid credit</option>
              <option value="fixed_period">Fixed period</option>
            </select>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '-8px', marginBottom: '16px' }}>
            {overdueStrategy === 'oldest_credit'
              ? 'Days since the oldest unpaid credit transaction exceeds the threshold.'
              : 'Days since the last transaction exceeds the threshold.'}
          </div>

          <div className="field">
            <label htmlFor="overdueThresholdDays">Grace period (days)</label>
            <input
              type="number"
              id="overdueThresholdDays"
              min="1"
              max="365"
              value={overdueThresholdDays}
              onChange={(e) => setOverdueThresholdDays(parseInt(e.target.value) || 7)}
            />
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '-8px' }}>
            Customer is marked overdue only after this many days.
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
