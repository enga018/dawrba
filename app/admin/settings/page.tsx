'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetchJson } from '@/lib/adminApiClient'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/lib/toast'

interface PlatformSettings {
  app_name: string
  logo_url: string | null
  currency: string
  timezone: string
  notifications_enabled: boolean
  backup_enabled: boolean
  theme: string
}

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'MVR']
const TIMEZONES = ['Asia/Kolkata', 'Asia/Colombo', 'Indian/Maldives', 'Asia/Dhaka', 'UTC']

export default function AdminSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [isDark, setIsDark] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    adminFetchJson<{ settings: PlatformSettings; adminEmail: string | null }>('/api/admin/settings')
      .then((d) => {
        setSettings(d.settings)
        setAdminEmail(d.adminEmail || '')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load settings'))

    const stored = localStorage.getItem('theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(stored === 'dark' || (stored !== 'light' && systemDark))
  }, [])

  const saveSettings = async (patch: Partial<PlatformSettings>) => {
    if (!settings) return
    const next = { ...settings, ...patch }
    setSettings(next)
    setSaving(true)
    try {
      await adminFetchJson('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
    saveSettings({ theme: next ? 'dark' : 'light' })
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setPasswordSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      showToast('Password updated')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (error && !settings) {
    return (
      <div className="empty">
        <i className="fa-solid fa-triangle-exclamation"></i>
        <p>{error}</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--blue)', margin: '0 auto' }}></div>
      </div>
    )
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div className="settings-section-title">Platform</div>
        <div className="detail-card">
          <div className="field">
            <label htmlFor="app-name">App Name</label>
            <input
              id="app-name"
              type="text"
              value={settings.app_name}
              onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
              onBlur={(e) => saveSettings({ app_name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="logo-url">Logo URL</label>
            <input
              id="logo-url"
              type="text"
              placeholder="https://..."
              value={settings.logo_url || ''}
              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
              onBlur={(e) => saveSettings({ logo_url: e.target.value || null })}
            />
          </div>
          <div className="field">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency"
              value={settings.currency}
              onChange={(e) => saveSettings({ currency: e.target.value })}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="timezone">Timezone</label>
            <select
              id="timezone"
              value={settings.timezone}
              onChange={(e) => saveSettings({ timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="settings-section-title">Notifications</div>
        <div className="settings-section">
          <div className="settings-row" onClick={() => saveSettings({ notifications_enabled: !settings.notifications_enabled })} role="button" style={{ cursor: 'pointer' }}>
            <div className="settings-row-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <i className="fa-solid fa-bell"></i>
            </div>
            <div className="settings-row-content">
              <div className="settings-row-title">Platform Notifications</div>
              <div className="settings-row-sub">Send system notifications to admins</div>
            </div>
            <div className={`profile-toggle-switch ${settings.notifications_enabled ? 'active' : ''}`}>
              <div className="profile-toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="settings-section-title">Backup</div>
        <div className="settings-section">
          <div className="settings-row" onClick={() => saveSettings({ backup_enabled: !settings.backup_enabled })} role="button" style={{ cursor: 'pointer' }}>
            <div className="settings-row-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <i className="fa-solid fa-database"></i>
            </div>
            <div className="settings-row-content">
              <div className="settings-row-title">Automatic Backups</div>
              <div className="settings-row-sub">Daily backups of platform data</div>
            </div>
            <div className={`profile-toggle-switch ${settings.backup_enabled ? 'active' : ''}`}>
              <div className="profile-toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="settings-section-title">Appearance</div>
        <div className="settings-section">
          <div className="settings-row" onClick={toggleTheme} role="button" style={{ cursor: 'pointer' }}>
            <div className="settings-row-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <i className="fa-solid fa-moon"></i>
            </div>
            <div className="settings-row-content">
              <div className="settings-row-title">Dark Mode</div>
              <div className="settings-row-sub">Theme for this admin console</div>
            </div>
            <div className={`profile-toggle-switch ${isDark ? 'active' : ''}`}>
              <div className="profile-toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="settings-section-title">Admin Account</div>
        <div className="detail-card" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>Email</label>
            <input type="text" value={adminEmail} readOnly />
          </div>
        </div>
        <form onSubmit={handlePasswordChange} className="detail-card">
          <div className="field">
            <label htmlFor="admin-new-password">New Password</label>
            <input
              id="admin-new-password"
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <div className="field">
            <label htmlFor="admin-confirm-password">Confirm Password</label>
            <input
              id="admin-confirm-password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={passwordSaving || !newPassword}>
            {passwordSaving ? <span className="spinner"></span> : 'Update Password'}
          </button>
          {passwordError && <div className="auth-error" style={{ display: 'block' }}>{passwordError}</div>}
        </form>
      </div>

      <div style={{ marginBottom: 24 }}>
        <button className="profile-logout" onClick={handleLogout}>
          <div className="profile-logout-icon">
            <i className="fa-solid fa-right-from-bracket"></i>
          </div>
          <div className="profile-logout-text">
            <div className="profile-logout-title">Logout</div>
            <div className="profile-logout-sub">Sign out of the admin console</div>
          </div>
        </button>
      </div>

      {error && (
        <div className="admin-notice">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}
      {saving && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Saving…</div>}
    </>
  )
}
