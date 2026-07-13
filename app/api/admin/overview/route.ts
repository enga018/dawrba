import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/adminAuth'
import { getTenantSummaries } from '@/lib/adminData'

export async function GET(req: Request) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const tenants = await getTenantSummaries()

    const totalTenants = tenants.length
    const totalCustomers = tenants.reduce((sum, t) => sum + t.customerCount, 0)

    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const weekAgo = now - 7 * dayMs
    const twoWeeksAgo = now - 14 * dayMs

    const activeTenantsToday = tenants.filter(
      (t) => t.lastActive && now - new Date(t.lastActive).getTime() < dayMs
    ).length

    const signupsThisWeek = tenants.filter(
      (t) => t.signupDate && new Date(t.signupDate).getTime() >= weekAgo
    ).length
    const signupsPriorWeek = tenants.filter(
      (t) => t.signupDate && new Date(t.signupDate).getTime() >= twoWeeksAgo && new Date(t.signupDate).getTime() < weekAgo
    ).length

    const days = 30
    const counts: Record<string, number> = {}
    for (const t of tenants) {
      if (!t.signupDate) continue
      const key = new Date(t.signupDate).toISOString().slice(0, 10)
      counts[key] = (counts[key] || 0) + 1
    }
    const registrationGrowth = Array.from({ length: days }, (_, i) => {
      const d = new Date(now - (days - 1 - i) * dayMs)
      const key = d.toISOString().slice(0, 10)
      return { date: key, count: counts[key] || 0 }
    })

    const tenantHealth = {
      healthy: tenants.filter((t) => t.health === 'healthy').length,
      idle: tenants.filter((t) => t.health === 'idle').length,
      issue: tenants.filter((t) => t.health === 'issue').length,
    }

    const insights = buildPlatformInsights(tenants, signupsThisWeek, signupsPriorWeek)

    const recentActivity = [...tenants]
      .filter((t) => t.signupDate)
      .sort((a, b) => new Date(b.signupDate as string).getTime() - new Date(a.signupDate as string).getTime())
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        shopName: t.shopName || t.email || 'New tenant',
        timestamp: t.signupDate,
        type: 'signup' as const,
      }))

    return NextResponse.json({
      totalTenants,
      totalCustomers,
      activeTenantsToday,
      signupsThisWeek,
      registrationGrowth,
      tenantHealth,
      insights,
      recentActivity,
    })
  } catch (err) {
    console.error('Admin overview error:', err)
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 })
  }
}

function buildPlatformInsights(
  tenants: Awaited<ReturnType<typeof getTenantSummaries>>,
  signupsThisWeek: number,
  signupsPriorWeek: number
) {
  const candidates: Array<{ priority: number; icon: string; iconColor: string; title: string; body: string }> = []

  const issueCount = tenants.filter((t) => t.health === 'issue').length
  if (issueCount > 0) {
    candidates.push({
      priority: 0,
      icon: 'fa-circle-exclamation',
      iconColor: 'red',
      title: 'Needs Support',
      body: `${issueCount} tenant${issueCount === 1 ? '' : 's'} suspended or flagged for support`,
    })
  }

  const idleCount = tenants.filter((t) => t.health === 'idle').length
  if (idleCount > 0) {
    candidates.push({
      priority: 1,
      icon: 'fa-triangle-exclamation',
      iconColor: 'orange',
      title: 'Inactive Tenants',
      body: `${idleCount} tenant${idleCount === 1 ? '' : 's'} inactive for 7+ days`,
    })
  }

  const unverifiedCount = tenants.filter((t) => !t.emailConfirmed).length
  if (unverifiedCount > 0) {
    candidates.push({
      priority: 2,
      icon: 'fa-envelope-circle-check',
      iconColor: 'orange',
      title: 'Unverified Accounts',
      body: `${unverifiedCount} account${unverifiedCount === 1 ? '' : 's'} pending email verification`,
    })
  }

  if (signupsPriorWeek > 0) {
    const pct = Math.round(((signupsThisWeek - signupsPriorWeek) / signupsPriorWeek) * 100)
    if (pct !== 0) {
      candidates.push({
        priority: 3,
        icon: pct > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down',
        iconColor: pct > 0 ? 'green' : 'red',
        title: 'Signup Trend',
        body: `Tenant signups ${pct > 0 ? 'increased' : 'decreased'} ${Math.abs(pct)}% vs last week`,
      })
    }
  }

  if (signupsThisWeek > 0) {
    candidates.push({
      priority: 4,
      icon: 'fa-store',
      iconColor: 'green',
      title: 'New Signups',
      body: `${signupsThisWeek} new tenant${signupsThisWeek === 1 ? '' : 's'} joined this week`,
    })
  }

  if (candidates.length === 0) {
    candidates.push({
      priority: 5,
      icon: 'fa-circle-check',
      iconColor: 'green',
      title: 'All Clear',
      body: 'All tenants are active and healthy',
    })
  }

  return candidates.sort((a, b) => a.priority - b.priority).slice(0, 3)
}
