import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const ids = Array.isArray(body.ids) ? (body.ids as string[]) : []
    const action = body.action as 'activate' | 'suspend' | 'delete'

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No tenants selected' }, { status: 400 })
    }

    if (action === 'activate' || action === 'suspend') {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_suspended: action === 'suspend' })
        .in('id', ids)
      if (error) throw error
      return NextResponse.json({ ok: true, count: ids.length })
    }

    if (action === 'delete') {
      const results = await Promise.allSettled(ids.map((id) => supabaseAdmin.auth.admin.deleteUser(id)))
      const failed = results.filter((r) => r.status === 'rejected').length
      return NextResponse.json({ ok: true, count: ids.length - failed, failed })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('Admin bulk tenant action error:', err)
    return NextResponse.json({ error: 'Failed to update tenants' }, { status: 500 })
  }
}
