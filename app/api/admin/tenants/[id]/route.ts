import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params

  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(id)
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('shop_name, owner_name, phone, is_suspended')
      .eq('id', id)
      .single()
    const profile = profileData as { shop_name: string | null; owner_name: string | null; phone: string | null; is_suspended: boolean } | null
    if (profileError) throw profileError

    const { data: rawCustomers, error: customersError } = await supabaseAdmin
      .from('customers')
      .select('id, name, phone, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
    if (customersError) throw customersError

    const customers = (rawCustomers || []) as { id: string; name: string; phone: string | null; created_at: string }[]

    const isSuspended = profile?.is_suspended ?? false
    const shopName = profile?.shop_name ?? null
    const status = isSuspended ? 'suspended' : !shopName ? 'pending' : 'active'

    return NextResponse.json({
      profile: {
        id,
        email: userData.user.email,
        signupDate: userData.user.created_at,
        lastSignInAt: userData.user.last_sign_in_at ?? null,
        emailConfirmed: !!userData.user.email_confirmed_at,
        shopName,
        ownerName: profile?.owner_name ?? null,
        phone: profile?.phone ?? null,
        status,
      },
      customers,
    })
  } catch (err) {
    console.error('Admin tenant detail error:', err)
    return NextResponse.json({ error: 'Failed to load tenant' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params

  try {
    const body = await req.json()
    const action = body.action as 'activate' | 'suspend' | 'reset'

    if (action === 'activate' || action === 'suspend') {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_suspended: action === 'suspend' })
        .eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true, status: action === 'suspend' ? 'suspended' : 'active' })
    }

    if (action === 'reset') {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(id)
      if (userError || !userData.user?.email) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      }
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: userData.user.email,
      })
      if (linkError) throw linkError
      return NextResponse.json({ ok: true, resetLink: linkData.properties?.action_link ?? null })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('Admin tenant action error:', err)
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Admin delete tenant error:', err)
    return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 })
  }
}
