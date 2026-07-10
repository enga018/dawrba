'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'

export default function SettingsPage() {
  const [shopName, setShopName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
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
        .select('shop_name, phone')
        .eq('id', user.id)
        .single()

      if (data?.shop_name) setShopName(data.shop_name)
      if (data?.phone) setPhone(data.phone)

      const stored = localStorage.getItem('theme')
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(stored === 'dark' || (stored !== 'light' && systemDark))

      setLoading(false)
    }
    loadProfile()
  }, [router])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
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
          <h2>Profile</h2>
        </div>
      </Link>

      <div className="profile-header">
        <div className="profile-avatar">
          {getInitials(shopName || 'U')}
        </div>
        <div className="profile-info">
          <div className="profile-name">{shopName || 'My Shop'}</div>
          {phone && <div className="profile-phone">{phone}</div>}
        </div>
      </div>

      <div className="profile-menu">
        <Link href="/profile/shop-information" className="profile-menu-item">
          <div className="profile-menu-icon" style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
            <i className="fa-solid fa-store"></i>
          </div>
          <div className="profile-menu-text">
            <div className="profile-menu-title">Shop Information</div>
            <div className="profile-menu-sub">Name, owner, phone</div>
          </div>
          <i className="fa-solid fa-chevron-right profile-menu-chevron"></i>
        </Link>

        <Link href="/profile/notifications" className="profile-menu-item">
          <div className="profile-menu-icon" style={{ background: 'var(--tint-orange)', color: 'var(--orange)' }}>
            <i className="fa-solid fa-bell"></i>
          </div>
          <div className="profile-menu-text">
            <div className="profile-menu-title">Notifications</div>
            <div className="profile-menu-sub">Reminders and alerts</div>
          </div>
          <i className="fa-solid fa-chevron-right profile-menu-chevron"></i>
        </Link>

        <div className="profile-menu-item" onClick={toggleTheme} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleTheme() }}>
          <div className="profile-menu-icon" style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
            <i className="fa-solid fa-moon"></i>
          </div>
          <div className="profile-menu-text">
            <div className="profile-menu-title">Dark Mode</div>
            <div className="profile-menu-sub">Appearance settings</div>
          </div>
          <div className="profile-toggle">
            <span className="profile-toggle-label">{isDark ? 'On' : 'Off'}</span>
            <div className={`profile-toggle-switch ${isDark ? 'active' : ''}`}>
              <div className="profile-toggle-knob"></div>
            </div>
          </div>
        </div>

        <Link href="/profile/change-password" className="profile-menu-item">
          <div className="profile-menu-icon" style={{ background: 'var(--tint-green)', color: 'var(--green)' }}>
            <i className="fa-solid fa-key"></i>
          </div>
          <div className="profile-menu-text">
            <div className="profile-menu-title">Change Password</div>
            <div className="profile-menu-sub">Update account security</div>
          </div>
          <i className="fa-solid fa-chevron-right profile-menu-chevron"></i>
        </Link>

        <Link href="/profile/export-data" className="profile-menu-item">
          <div className="profile-menu-icon" style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
            <i className="fa-solid fa-download"></i>
          </div>
          <div className="profile-menu-text">
            <div className="profile-menu-title">Export Data</div>
            <div className="profile-menu-sub">Download backup</div>
          </div>
          <i className="fa-solid fa-chevron-right profile-menu-chevron"></i>
        </Link>

        <div className="profile-menu-item">
          <div className="profile-menu-icon" style={{ background: 'var(--surface-alt)', color: 'var(--muted)' }}>
            <i className="fa-solid fa-circle-info"></i>
          </div>
          <div className="profile-menu-text">
            <div className="profile-menu-title">App Version</div>
            <div className="profile-menu-sub">DawrBa v1.0.0</div>
          </div>
          <span className="profile-version-text">v1.0.0</span>
        </div>
      </div>
    </>
  )
}
