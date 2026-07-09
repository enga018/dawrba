'use client'

import { useState, useEffect } from 'react'
import SummaryCard from './SummaryCard'

interface SummaryData {
  todayCredit: number
  todayCollected: number
  outstanding: number
  overdueCount: number
  todayCreditTrend?: number
  todayCollectedTrend?: number
  outstandingTrend?: number
  overdueTrend?: number
}

export default function DashboardSummary() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/dashboard-summary')
      const data = await response.json()
      setSummary(data)
    } catch (error) {
      console.error('Error fetching dashboard summary:', error)
      // Set mock data for now
      setSummary({
        todayCredit: 15000,
        todayCollected: 8500,
        outstanding: 42000,
        overdueCount: 3,
        todayCreditTrend: 12,
        todayCollectedTrend: 8,
        outstandingTrend: -3,
        overdueTrend: -2,
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px', 
        marginBottom: '24px' 
      }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ 
            background: 'white', 
            borderRadius: '18px', 
            padding: '20px', 
            border: '1px solid var(--border)',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)'
          }}>
            <div style={{ 
              height: '16px', 
              background: '#f3f7fb', 
              borderRadius: '4px', 
              marginBottom: '12px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{ 
              height: '32px', 
              background: '#f3f7fb', 
              borderRadius: '4px', 
              width: '60%',
              marginBottom: '8px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{ 
              height: '20px', 
              background: '#f3f7fb', 
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
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
      gap: '20px', 
      marginBottom: '24px'
    }}>
      <SummaryCard
        title="Today Credit"
        value={summary.todayCredit}
        icon={<i className="fa-solid fa-plus"></i>}
        color="var(--red)"
        trend={summary.todayCreditTrend ? { value: summary.todayCreditTrend, label: 'from yesterday' } : undefined}
      />
      
      <SummaryCard
        title="Collected Today"
        value={summary.todayCollected}
        icon={<i className="fa-solid fa-arrow-right"></i>}
        color="var(--green)"
        trend={summary.todayCollectedTrend ? { value: summary.todayCollectedTrend, label: 'from yesterday' } : undefined}
      />
      
      <SummaryCard
        title="Outstanding"
        value={summary.outstanding}
        icon={<i className="fa-solid fa-clock"></i>}
        color="var(--blue)"
        trend={summary.outstandingTrend ? { value: summary.outstandingTrend, label: 'from yesterday' } : undefined}
      />
      
      <SummaryCard
        title="Overdue"
        value={summary.overdueCount}
        icon={<i className="fa-solid fa-user-slash"></i>}
        color="#f97316"
        trend={summary.overdueTrend ? { value: summary.overdueTrend, label: 'from yesterday' } : undefined}
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