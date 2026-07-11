import 'server-only'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type AdminAuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse }

export async function requirePlatformAdmin(req: Request): Promise<AdminAuthResult> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: rawProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', userData.user.id)
    .single()

  const profile = rawProfile as { is_platform_admin: boolean } | null

  if (profileError || !profile?.is_platform_admin) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true, user: userData.user }
}
