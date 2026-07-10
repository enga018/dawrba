'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { percentTrend } from '@/lib/utils'
import SummaryCard from './SummaryCard'

interface SummaryData {
  todayCredit: number
  todayCollected: number
  outstanding: number
  overdueCount: number
  todayCreditTrend?: number
  todayCollectedTrend?: number
}

export default function DashboardSummary() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        setSummary(null)
        return
      }

      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, opening_balance')
        .eq('user_id', user.id)

      if (customersError) throw customersError

      const ids = (customers || []).map((c) => c.id)

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const yesterdayStart = new Date(todayStart)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)

      let balances: Record<string, number> = {}
      let todayCredit = 0
      let todayCollected = 0
      let yesterdayCredit = 0
      let yesterdayCollected = 0

      if (ids.length > 0) {
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('customer_id, amount, created_at')
          .in('customer_id', ids)

        if (txError) throw txError

        for (const t of txData || []) {
          balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)

          const createdAt = new Date(t.created_at)
          if (createdAt >= todayStart) {
            if (t.amount > 0) todayCredit += t.amount
            else todayCollected += Math.abs(t.amount)
          } else if (createdAt >= yesterdayStart && createdAt < todayStart) {
            if (t.amount > 0) yesterdayCredit += t.amount
            else yesterdayCollected += Math.abs(t.amount)
          }
        }
      }

      let outstanding = 0
      let overdueCount = 0
      for (const c of customers || []) {
        const balance = (c.opening_balance || 0) + (balances[c.id] || 0)
        if (balance > 0) {
          outstanding += balance
          overdueCount += 1
        }
      }

      setSummary({
        todayCredit,
        todayCollected,
        outstanding,
        overdueCount,
        todayCreditTrend: percentTrend(todayCredit, yesterdayCredit),
        todayCollectedTrend: percentTrend(todayCollected, yesterdayCollected),
      })
    } catch (error) {
      console.error('Error fetching dashboard summary:', error)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="summary-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            background: 'var(--surface)',
            borderRadius: '14px',
            padding: '12px',
            border: '1px solid var(--border)',
          }}>
            <div style={{
              height: '12px',
              background: 'var(--surface-alt)',
              borderRadius: '4px',
              marginBottom: '8px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
              height: '22px',
              background: 'var(--surface-alt)',
              borderRadius: '4px',
              width: '60%',
              marginBottom: '6px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
              height: '14px',
              background: 'var(--surface-alt)',
              borderRadius: '4px',
              width: '40%',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          </div>
        ))}
      </div>
    )
  }

  if (!summary) return null

  return (
    <div className="summary-grid">
      <SummaryCard
        title="Today Credit"
        value={summary.todayCredit}
        icon={<i className="fa-solid fa-plus"></i>}
        color="var(--red)"
        bg="var(--tint-red)"
        trend={summary.todayCreditTrend ? { value: summary.todayCreditTrend, label: 'from yesterday' } : undefined}
      />

      <SummaryCard
        title="Collected Today"
        value={summary.todayCollected}
        icon={<i className="fa-solid fa-arrow-right"></i>}
        color="var(--green)"
        bg="var(--tint-green)"
        trend={summary.todayCollectedTrend ? { value: summary.todayCollectedTrend, label: 'from yesterday' } : undefined}
      />

      <SummaryCard
        title="Outstanding"
        value={summary.outstanding}
        icon={<i className="fa-solid fa-clock"></i>}
        color="var(--blue)"
        bg="var(--tint-blue)"
      />

      <SummaryCard
        title="Overdue"
        value={summary.overdueCount}
        icon={<i className="fa-solid fa-user-slash"></i>}
        color="var(--orange)"
        bg="var(--tint-orange)"
        format="count"
      />
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}