import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getTenantSummaries } from '@/lib/adminData'

export async function GET(req: Request) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const tenants = await getTenantSummaries()

    const totalShopOwners = tenants.length
    const totalCustomers = tenants.reduce((sum, t) => sum + t.customerCount, 0)

    const { data: rawTx, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('amount')
    if (txError) throw txError
    const transactions = (rawTx || []) as { amount: number }[]
    const totalTransactionVolume = transactions.reduce(
      (sum, t) => sum + Math.abs(t.amount || 0),
      0
    )

    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const signupsThisWeek = tenants.filter(
      (t) => t.signupDate && new Date(t.signupDate).getTime() >= weekAgo
    ).length

    const days = 14
    const dayMs = 24 * 60 * 60 * 1000
    const counts: Record<string, number> = {}
    for (const t of tenants) {
      if (!t.signupDate) continue
      const key = new Date(t.signupDate).toISOString().slice(0, 10)
      counts[key] = (counts[key] || 0) + 1
    }
    const signupTrend = Array.from({ length: days }, (_, i) => {
      const d = new Date(now - (days - 1 - i) * dayMs)
      const key = d.toISOString().slice(0, 10)
      return { date: key, count: counts[key] || 0 }
    })

    return NextResponse.json({
      totalShopOwners,
      totalCustomers,
      totalTransactionVolume,
      signupsThisWeek,
      signupTrend,
    })
  } catch (err) {
    console.error('Admin overview error:', err)
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 })
  }
}
