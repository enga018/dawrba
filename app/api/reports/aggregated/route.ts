import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateReportMetrics } from '@/lib/reportsCalculations'

/**
 * Server-side report aggregation endpoint
 * Offloads heavy calculations to the backend for better performance
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const period = (searchParams.get('period') || 'today') as 'today' | 'week' | 'month'

    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    // Fetch profile for thresholds
    const { data: profileData } = await supabase
      .from('profiles')
      .select('weekly_report_day, overdue_threshold_days, overdue_reset_threshold_pct')
      .eq('id', userId)
      .single()

    const thresholdDays = profileData?.overdue_threshold_days || 7
    const resetThresholdPct = profileData?.overdue_reset_threshold_pct || 50
    const weekStartDay: 0 | 1 = profileData?.weekly_report_day === 'monday' ? 1 : 0

    // Fetch customers
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, opening_balance, created_at')
      .eq('user_id', userId)

    const customerIds = (customers || []).map(c => c.id)

    if (customerIds.length === 0) {
      return NextResponse.json({
        creditGiven: 0,
        collected: 0,
        outstanding: 0,
        txCount: 0,
        avgTransactionSize: 0,
        newCustomers: 0,
        prev: { creditGiven: 0, collected: 0, outstanding: 0, txCount: 0, avgTransactionSize: 0, newCustomers: 0 },
        overdueCustomers: [],
        highestCredit: null,
        highestCollection: null,
        collectionRateAllTime: 0,
        totalCreditAllTime: 0,
        totalCollectedAllTime: 0,
        overduePercent: 0,
        allTimeHighestCredit: null,
        allTimeHighestCollection: null,
        highestOutstanding: null,
        mostPayments: null,
        fullySettledThisMonth: 0,
        overdueCount: 0,
        dueTodayCount: 0,
        overdueAmount: 0,
      })
    }

    // Fetch all transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('customer_id, amount, date, created_at')
      .in('customer_id', customerIds)

    // Calculate metrics (runs on server, much faster)
    const metrics = calculateReportMetrics(
      customers || [],
      transactions || [],
      period,
      thresholdDays,
      resetThresholdPct,
      weekStartDay
    )

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error calculating report metrics:', error)
    return NextResponse.json(
      { error: 'Failed to calculate report metrics' },
      { status: 500 }
    )
  }
}
