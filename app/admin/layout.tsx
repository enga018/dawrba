'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OfflineBanner from '@/app/OfflineBanner'
import AdminSidebar from './AdminSidebar'
import AdminNavbar from './AdminNavbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'ok'>('checking')
  const [shopName, setShopName] = useState('')
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_platform_admin, shop_name')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_platform_admin) {
        router.push('/')
        return
      }

      if (!cancelled) {
        setShopName(profile.shop_name || '')
        setStatus('ok')
      }
    }

    checkAccess()

    return () => {
      cancelled = true
    }
  }, [router])

  if (status !== 'ok') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--blue)' }}></div>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <OfflineBanner />
      <AdminSidebar />
      <AdminNavbar />
      <div className="app-main">
        <div className="header">
          <div>
            <h1 className="header-mobile-title">Admin Dashboard</h1>
            <div className="admin-layout-subtitle">DawrBa Management Console</div>
          </div>
          <div className="header-actions">
            {shopName && (
              <button className="header-shop-name" title={shopName}>
                {shopName}
              </button>
            )}
            <button
              className="header-logout-btn"
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
            >
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  )
}
