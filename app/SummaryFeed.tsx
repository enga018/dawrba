'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, startOfDay } from '@/lib/utils'

interface SummaryData {
  creditsCount: number
  paymentsCount: number
  netChange: number
  loading: boolean
  error: string | null
}

export default function SummaryFeed() {
  const [data, setData] = useState<SummaryData>({
    creditsCount: 0,
    paymentsCount: 0,
    netChange: 0,
    loading: true,
    error: null,
  })

  const loadData = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) { setData((prev) => ({ ...prev, loading: false })); return }

      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)

      if (custError) throw custError

      const ids = (customers || []).map((c) => c.id)
      if (ids.length === 0) {
        setData({ creditsCount: 0, paymentsCount: 0, netChange: 0, loading: false, error: null })
        return
      }

      const todayISO = startOfDay(new Date()).toISOString()

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .in('customer_id', ids)
        .gte('created_at', todayISO)

      if (txError) throw txError

      let creditsCount = 0
      let paymentsCount = 0
      let netChange = 0

      for (const tx of txData || []) {
        if (tx.amount > 0) {
          creditsCount += 1
        } else {
          paymentsCount += 1
        }
        netChange -= tx.amount
      }

      setData({ creditsCount, paymentsCount, netChange, loading: false, error: null })
    } catch (error) {
      console.error('Error loading summary feed:', error)
      setData((prev) => ({ ...prev, loading: false, error: 'Failed to load summary' }))
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const onRefresh = () => loadData()
    window.addEventListener('dawrba:refresh', onRefresh)
    return () => window.removeEventListener('dawrba:refresh', onRefresh)
  }, [loadData])

  if (data.loading) {
    return (
      <div className="home-section-card">
        <div className="home-section-header">
          <h3>Summary Feed</h3>
        </div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="home-section-card">
      <div className="home-section-header">
        <h3>Summary Feed</h3>
      </div>

      <div className="summary-feed-list">
        <div className="summary-feed-item">
          <div className="summary-feed-icon credit">
            <i className="fa-solid fa-plus"></i>
          </div>
          <div className="summary-feed-text">
            <div className="summary-feed-label">
              {data.creditsCount} credit{data.creditsCount !== 1 ? 's' : ''} added
            </div>
            <div className="summary-feed-time">Today</div>
          </div>
        </div>

        <div className="summary-feed-item">
          <div className="summary-feed-icon payment">
            <i className="fa-solid fa-check"></i>
          </div>
          <div className="summary-feed-text">
            <div className="summary-feed-label">
              {data.paymentsCount} payment{data.paymentsCount !== 1 ? 's' : ''} collected
            </div>
            <div className="summary-feed-time">Today</div>
          </div>
        </div>

        <div className="summary-feed-item">
          <div className="summary-feed-icon net">
            <i className="fa-solid fa-chart-line"></i>
          </div>
          <div className="summary-feed-text">
            <div className="summary-feed-label">
              Net collection: {data.netChange >= 0 ? '+' : '-'}₹{formatCurrency(Math.abs(data.netChange))}
            </div>
            <div className="summary-feed-time">Today</div>
          </div>
        </div>
      </div>

      {data.error && (
        <div style={{ padding: '12px', color: '#dc2626', fontSize: '0.85rem', textAlign: 'center' }}>
          {data.error}
        </div>
      )}
    </div>
  )
}
