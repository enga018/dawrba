'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LandingPage from './LandingPage'
import DashboardPage from './DashboardPage'
import OfflineBanner from './OfflineBanner'
import ThemeToggle from './ThemeToggle'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import AddModal from './AddModal'
import type { User } from '@supabase/supabase-js'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [shopName, setShopName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOffline = () => setIsOnline(false)
    const handleOnline = () => setIsOnline(true)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

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
      } catch {
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="app-layout">
        <OfflineBanner />
        <Sidebar />
        <div className="app-main">
          <div className="header">
            <div className="header-left">
              <h1 className="header-greeting">{getGreeting()}</h1>
              {shopName && <div className="header-shop-label">{shopName}</div>}
            </div>
            <div className="header-actions">
              <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}>
                <i className={`fa-solid ${isOnline ? 'fa-wifi' : 'fa-wifi'}`}></i>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              <button className="header-logout-btn" onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}>
                <i className="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
          </div>
          <div className="content content-wide">
            <DashboardPage />
          </div>
          <button className="add-btn" title="Add credit or customer" onClick={() => setShowQuickAdd(true)}>
            <i className="fa-solid fa-plus"></i>
          </button>
          <BottomNav onAddClick={() => setShowQuickAdd(true)} />
        </div>
        <AddModal show={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
      </div>
    )
  }

  return <LandingPage />
}
