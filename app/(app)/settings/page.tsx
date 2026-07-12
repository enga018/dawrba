'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'

export default function SettingsPage() {
  const [shopName, setShopName] = useState('')
  const [phone, setPhone] = useState('')
  const [overdueRemindersEnabled, setOverdueRemindersEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const router = useRouter()

  const loadProfile = async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) {
      router.push('/login')
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('shop_name, phone, overdue_reminders_enabled')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        if (data.shop_name) {
          setShopName(data.shop_name)
        }
        if (data.phone) {
          setPhone(data.phone)
        }
        if (data.overdue_reminders_enabled !== null && data.overdue_reminders_enabled !== undefined) {
          setOverdueRemindersEnabled(data.overdue_reminders_enabled)
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    }

    const stored = localStorage.getItem('theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(stored === 'dark' || (stored !== 'light' && systemDark))

    setLoading(false)
  }

  useEffect(() => {
    loadProfile()
  }, [router])

  useEffect(() => {
    // Refresh when returning from sub-pages
    window.addEventListener('focus', loadProfile)
    return () => window.removeEventListener('focus', loadProfile)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const toggleOverdueReminders = async () => {
    const next = !overdueRemindersEnabled
    setOverdueRemindersEnabled(next)
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (user) {
        const { error } = await supabase.from('profiles').update({ overdue_reminders_enabled: next }).eq('id', user.id)
        if (error?.message?.includes('column')) {
          // Column doesn't exist yet - keep the local state
        }
      }
    } catch {
      // Silent fail - local state is updated
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
      <div className="profile-header">
        <div className="profile-avatar">
          {getInitials(shopName || 'U')}
        </div>
        <div className="profile-info">
          <div className="profile-name">{shopName || 'My Shop'}</div>
          {phone && <div className="profile-phone">{phone}</div>}
        </div>
      </div>

      {/* Profile Section */}
      <div style={{ marginBottom: '24px' }}>
        <div className="settings-section-title">Profile</div>
        <div className="settings-section">
          <Link href="/settings/shop-information" className="settings-row">
            <div className="settings-row-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <i className="fa-solid fa-store"></i>
            </div>
            <div className="settings-row-content">
              <div className="settings-row-title">Shop Information</div>
              <div className="settings-row-sub">Name and contact details</div>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: '#9CA3AF', fontSize: '0.7rem' }}></i>
          </Link>
        </div>
      </div>

      {/* Business Settings Section */}
      <div style={{ marginBottom: '24px' }}>
        <div className="settings-section-title">Business Settings</div>
        <div className="settings-section">
          <Link href="/settings/business-settings" className="settings-row">
            <div className="settings-row-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <i className="fa-solid fa-sliders"></i>
            </div>
            <div className="settings-row-content">
              <div className="settings-row-title">Business Preferences</div>
              <div className="settings-row-sub">Week ends on, overdue period</div>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: '#9CA3AF', fontSize: '0.7rem' }}></i>
          </Link>
        </div>
      </div>

      {/* Notifications Section */}
      <div style={{ marginBottom: '24px' }}>
        <div className="settings-section-title">Notifications</div>
        <div className="settings-section">
          <div className="settings-row" onClick={toggleOverdueReminders} role="button" style={{ cursor: 'pointer' }}>
            <div className="settings-row-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <i className="fa-solid fa-bell"></i>
            </div>
            <div className="settings-row-content">
              <div className="settings-row-title">Overdue Reminders</div>
              <div className="settings-row-sub">Get notified about overdue payments</div>
            </div>
            <div className={`profile-toggle-switch ${overdueRemindersEnabled ? 'active' : ''}`}>
              <div className="profile-toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div style={{ marginBottom: '24px' }}>
        <div className="settings-section-title">Security</div>
        <div className="settings-section">
          <Link href="/settings/change-password" className="settings-row">
            <div className="settings-row-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <i className="fa-solid fa-lock"></i>
            </div>
            <div className="settings-row-content">
              <div className="settings-row-title">Change Password</div>
              <div className="settings-row-sub">Update your account password</div>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: '#9CA3AF', fontSize: '0.7rem' }}></i>
          </Link>
        </div>
      </div>

      {/* About Section */}
      <div style={{ marginBottom: '24px' }}>
        <div className="settings-section-title">About</div>
        <div className="settings-section">
          <div className="settings-row">
            <div className="settings-row-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <i className="fa-solid fa-circle-info"></i>
            </div>
            <div className="settings-row-content">
              <div className="settings-row-title">App Version</div>
              <div className="settings-row-sub">DawrBa v1.0.0</div>
            </div>
            <span style={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 500 }}>v1.0.0</span>
          </div>
          <Link href="/settings/export-data" className="settings-row">
            <div className="settings-row-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <i className="fa-solid fa-download"></i>
            </div>
            <div className="settings-row-content">
              <div className="settings-row-title">Export Data</div>
              <div className="settings-row-sub">Download your data backup</div>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: '#9CA3AF', fontSize: '0.7rem' }}></i>
          </Link>
        </div>
      </div>

      {/* Appearance (Dark Mode) */}
      <div style={{ marginBottom: '24px' }}>
        <div className="settings-section-title">Appearance</div>
        <div className="settings-section">
          <div className="settings-row" onClick={toggleTheme} role="button" style={{ cursor: 'pointer' }}>
            <div className="settings-row-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <i className="fa-solid fa-moon"></i>
            </div>
            <div className="settings-row-content">
              <div className="settings-row-title">Dark Mode</div>
              <div className="settings-row-sub">System theme preference</div>
            </div>
            <div className={`profile-toggle-switch ${isDark ? 'active' : ''}`}>
              <div className="profile-toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
