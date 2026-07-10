'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LandingPage from './LandingPage'
import DashboardPage from './DashboardPage'
import OfflineBanner from './OfflineBanner'
import ThemeToggle from './ThemeToggle'
import BottomNav from './BottomNav'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [shopName, setShopName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)

          const { data: profileData } = await supabase
            .from('profiles')
            .select('shop_name')
            .eq('id', session.user.id)
            .single()

          if (profileData?.shop_name) {
            setShopName(profileData.shop_name)
          }
        }
        setIsLoading(false)
      } catch (error) {
        setIsLoading(false)
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  if (user) {
    return (
      <>
        <OfflineBanner />
        <div className="header">
          <h1>DawrBa<span className="dot"></span></h1>
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
              title="Settings"
              onClick={() => router.push('/settings')}
            >
              <i className="fa-solid fa-gear"></i>
            </button>
            <button
              className="header-btn header-btn-nav"
              title="Logout"
              onClick={handleLogout}
            >
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
        <div className="content content-wide">
          <DashboardPage />
        </div>
        <BottomNav />
      </>
    )
  }

  return <LandingPage />
}