'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(true)
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
    <>
      <div className="header">
        <h1>DawrBa<span className="dot"></span></h1>
        <div className="header-actions">
          {shopName && (
            <button
              className="header-shop-name"
              title="Edit shop name"
              onClick={() => router.push('/setup')}
            >
              {shopName}
            </button>
          )}
          <button
            className="header-btn"
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
    </>
  )
}
