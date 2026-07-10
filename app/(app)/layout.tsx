'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OfflineBanner from '@/app/OfflineBanner'
import ThemeToggle from '@/app/ThemeToggle'
import BottomNav from '@/app/BottomNav'
import Sidebar from '@/app/Sidebar'
import QuickAddSheet from '@/app/QuickAddSheet'
import type { User } from '@supabase/supabase-js'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      setUser(session.user)
      setLoading(false)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('shop_name')
        .eq('id', session.user.id)
        .single()

      if (profileData?.shop_name) {
        setShopName(profileData.shop_name)
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
      }
    })

    return () => subscription?.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="app-layout">
      <OfflineBanner />
      <Sidebar />
      <div className="app-main">
        <div className="header">
          <h1 className="header-mobile-title">DawrBa<span className="dot"></span></h1>
          <div className="header-actions">
            {shopName && (
              <button
                className="header-shop-name"
                title={shopName}
              >
                {shopName}
              </button>
            )}
            <ThemeToggle />
            <button
              className="header-btn header-btn-nav"
              title="Logout"
              onClick={handleLogout}
            >
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
        <div className="content">
          {children}
        </div>
        <BottomNav onAddClick={() => setShowQuickAdd(true)} />
      </div>
      <QuickAddSheet show={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
    </div>
  )
}
