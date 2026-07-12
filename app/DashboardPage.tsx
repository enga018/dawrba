'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardSummary from './DashboardSummary'
import NeedsAttention from './NeedsAttention'
import RecentTransactions from './RecentTransactions'
import SummaryFeed from './SummaryFeed'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [hasCustomers, setHasCustomers] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      setHasCustomers((data || []).length > 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const onRefresh = () => loadData()
    window.addEventListener('dawrba:refresh', onRefresh)
    return () => window.removeEventListener('dawrba:refresh', onRefresh)
  }, [loadData])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  if (!hasCustomers) {
    return (
      <div className="empty" style={{ padding: '60px 20px' }}>
        <i className="fa-solid fa-users-slash"></i>
        <p>No customers yet. Add your first customer to get started.</p>
      </div>
    )
  }

  return (
    <>
      <DashboardSummary />

      <div className="home-grid">
        <div className="home-grid-main">
          <NeedsAttention />
          <RecentTransactions limit={5} title="Recent Transactions" />
        </div>
        <div className="home-grid-side">
          <SummaryFeed />
        </div>
      </div>
    </>
  )
}
