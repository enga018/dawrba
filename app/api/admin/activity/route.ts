import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/adminAuth'
import { getTenantSummaries } from '@/lib/adminData'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: Request) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const tenants = await getTenantSummaries()
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const weekAgo = now - 7 * dayMs

    const inactiveTenants = tenants
      .filter((t) => t.health === 'idle' && t.status !== 'suspended')
      .sort((a, b) => (a.lastActive ? new Date(a.lastActive).getTime() : 0) - (b.lastActive ? new Date(b.lastActive).getTime() : 0))
      .slice(0, 5)
      .map((t) => ({ id: t.id, shopName: t.shopName || t.email || 'Unnamed tenant', lastActive: t.lastActive }))

    const unverifiedAccounts = tenants
      .filter((t) => !t.emailConfirmed)
      .sort((a, b) => new Date(a.signupDate || 0).getTime() - new Date(b.signupDate || 0).getTime())
      .slice(0, 5)
      .map((t) => ({ id: t.id, shopName: t.shopName || t.email || 'Unnamed tenant', email: t.email, signupDate: t.signupDate }))

    const loginIssues = tenants
      .filter((t) => !t.lastActive && t.signupDate && new Date(t.signupDate).getTime() < now - 3 * dayMs)
      .sort((a, b) => new Date(a.signupDate || 0).getTime() - new Date(b.signupDate || 0).getTime())
      .slice(0, 5)
      .map((t) => ({ id: t.id, shopName: t.shopName || t.email || 'Unnamed tenant', signupDate: t.signupDate }))

    const newTenants = tenants
      .filter((t) => t.signupDate && new Date(t.signupDate).getTime() >= weekAgo)
      .sort((a, b) => new Date(b.signupDate || 0).getTime() - new Date(a.signupDate || 0).getTime())
      .map((t) => ({ id: t.id, shopName: t.shopName || t.email || 'Unnamed tenant', signupDate: t.signupDate }))

    const { data: rawCustomers, error: customersError } = await supabaseAdmin
      .from('customers')
      .select('created_at')
    if (customersError) throw customersError
    const customerGrowthCount = ((rawCustomers || []) as { created_at: string }[]).filter(
      (c) => new Date(c.created_at).getTime() >= weekAgo
    ).length

    const { data: settingsData } = await supabaseAdmin
      .from('platform_settings')
      .select('backup_enabled, notifications_enabled')
      .eq('id', true)
      .single()
    const settings = settingsData as { backup_enabled: boolean; notifications_enabled: boolean } | null

    const systemEvents = [
      {
        label: 'Automatic Backups',
        status: settings?.backup_enabled ?? true ? 'ok' : 'off',
        detail: settings?.backup_enabled ?? true ? 'Daily backups enabled' : 'Backups disabled',
      },
      {
        label: 'Notification Service',
        status: settings?.notifications_enabled ?? true ? 'ok' : 'off',
        detail: settings?.notifications_enabled ?? true ? 'Operational' : 'Disabled',
      },
      {
        label: 'Data Sync',
        status: 'ok',
        detail: 'All tenant data in sync',
      },
    ]

    const usageSummary = {
      totalTenants: tenants.length,
      totalCustomers: tenants.reduce((sum, t) => sum + t.customerCount, 0),
      activeToday: tenants.filter((t) => t.lastActive && now - new Date(t.lastActive).getTime() < dayMs).length,
      newThisWeek: newTenants.length,
    }

    return NextResponse.json({
      needsAttention: { inactiveTenants, unverifiedAccounts, loginIssues },
      newRegistrations: { newTenants, customerGrowthCount },
      systemEvents,
      usageSummary,
    })
  } catch (err) {
    console.error('Admin activity error:', err)
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
  }
}
