'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { setupAutoSync } from '@/lib/offline'
import OfflineBanner from '@/app/OfflineBanner'
import BottomNav from '@/app/BottomNav'
import Sidebar from '@/app/Sidebar'
import FloatingAddButton from '@/app/FloatingAddButton'
import TransactionModal from '@/app/TransactionModal'
import AddCustomerModal from '@/app/AddCustomerModal'
import AddTransactionPicker from '@/app/AddTransactionPicker'
import type { User } from '@supabase/supabase-js'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [activeModal, setActiveModal] = useState<'credit' | 'pay' | 'add-customer' | null>(null)
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
    }

    checkAuth()
    setupAutoSync()

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

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <OfflineBanner />
        <div className="header">
          <h1 className="header-mobile-title">DawrBa<span className="dot"></span></h1>
        </div>
        <div className="content">
          {children}
        </div>
        <BottomNav onAddClick={() => setShowPicker(true)} />
      </div>
      <FloatingAddButton
        onAddSelect={(mode) => setActiveModal(mode === 'payment' ? 'pay' : mode === 'new' ? 'add-customer' : 'credit')}
      />
      <AddTransactionPicker
        show={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(mode) => {
          setShowPicker(false)
          setActiveModal(mode === 'payment' ? 'pay' : mode === 'new' ? 'add-customer' : 'credit')
        }}
      />
      <TransactionModal show={activeModal === 'credit'} mode="credit" onClose={() => setActiveModal(null)} />
      <TransactionModal show={activeModal === 'pay'} mode="pay" onClose={() => setActiveModal(null)} />
      <AddCustomerModal show={activeModal === 'add-customer'} onClose={() => setActiveModal(null)} />
    </div>
  )
}

