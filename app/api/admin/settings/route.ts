import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

interface PlatformSettings {
  app_name: string
  logo_url: string | null
  currency: string
  timezone: string
  notifications_enabled: boolean
  backup_enabled: boolean
  theme: string
}

export async function GET(req: Request) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .select('app_name, logo_url, currency, timezone, notifications_enabled, backup_enabled, theme')
      .eq('id', true)
      .single()
    if (error) throw error

    return NextResponse.json({ settings: data, adminEmail: auth.user.email })
  } catch (err) {
    console.error('Admin settings load error:', err)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const update: Partial<PlatformSettings> = {}

    if (typeof body.app_name === 'string') update.app_name = body.app_name.trim()
    if (typeof body.logo_url === 'string' || body.logo_url === null) update.logo_url = body.logo_url
    if (typeof body.currency === 'string') update.currency = body.currency
    if (typeof body.timezone === 'string') update.timezone = body.timezone
    if (typeof body.notifications_enabled === 'boolean') update.notifications_enabled = body.notifications_enabled
    if (typeof body.backup_enabled === 'boolean') update.backup_enabled = body.backup_enabled
    if (typeof body.theme === 'string') update.theme = body.theme

    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', true)
      .select('app_name, logo_url, currency, timezone, notifications_enabled, backup_enabled, theme')
      .single()
    if (error) throw error

    return NextResponse.json({ settings: data })
  } catch (err) {
    console.error('Admin settings update error:', err)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
