'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardSummary from './DashboardSummary'
import NeedsAttention from './NeedsAttention'
import RecentTransactions from './RecentTransactions'
import InsightsFeed from './InsightsFeed'

export interface DashboardCustomer {
  id: string
  name: string
  phone?: string
  opening_balance: number
  credit_limit: number | null
}

export interface DashboardTx {
  id: string
  customer_id: string
  amount: number
  date?: string
  created_at: string
}

export interface DashboardThresholds {
  thresholdDays: number
  resetThresholdPct: number
  slowPayingRatioPct: number
  balanceRiseThreshold: number
  largePaymentThreshold: number
}

const defaultThresholds: DashboardThresholds = {
  thresholdDays: 7,
  resetThresholdPct: 50,
  slowPayingRatioPct: 30,
  balanceRiseThreshold: 5000,
  largePaymentThreshold: 5000,
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<DashboardCustomer[]>([])
  const [transactions, setTransactions] = useState<DashboardTx[]>([])
  const [thresholds, setThresholds] = useState<DashboardThresholds>(defaultThresholds)

  const loadData = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) { setLoading(false); return }

      const [{ data: profileData }, { data: customersData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('overdue_threshold_days, overdue_reset_threshold_pct, slow_paying_ratio_pct, balance_rise_threshold, large_payment_threshold')
          .eq('id', user.id)
          .single(),
        supabase
          .from('customers')
          .select('id, name, phone, opening_balance, credit_limit')
          .eq('user_id', user.id),
      ])

      setThresholds({
        thresholdDays: profileData?.overdue_threshold_days || defaultThresholds.thresholdDays,
        resetThresholdPct: profileData?.overdue_reset_threshold_pct || defaultThresholds.resetThresholdPct,
        slowPayingRatioPct: profileData?.slow_paying_ratio_pct || defaultThresholds.slowPayingRatioPct,
        balanceRiseThreshold: profileData?.balance_rise_threshold || defaultThresholds.balanceRiseThreshold,
        largePaymentThreshold: profileData?.large_payment_threshold || defaultThresholds.largePaymentThreshold,
      })
      setCustomers(customersData || [])

      const ids = (customersData || []).map((c) => c.id)
      if (ids.length === 0) {
        setTransactions([])
        return
      }

      const { data: txData } = await supabase
        .from('transactions')
        .select('id, customer_id, amount, date, created_at')
        .in('customer_id', ids)

      setTransactions(txData || [])
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

  if (customers.length === 0) {
    return (
      <div className="empty" style={{ padding: '60px 20px' }}>
        <i className="fa-solid fa-users-slash"></i>
        <p>No customers yet. Add your first customer to get started.</p>
      </div>
    )
  }

  return (
    <>
      <DashboardSummary customers={customers} transactions={transactions} thresholds={thresholds} />

      <div className="home-grid">
        <div className="home-grid-main">
          <NeedsAttention customers={customers} transactions={transactions} thresholds={thresholds} />
          <RecentTransactions limit={5} title="Recent Transactions" />
        </div>
        <div className="home-grid-side">
          <InsightsFeed customers={customers} transactions={transactions} thresholds={thresholds} />
        </div>
      </div>
    </>
  )
}
