import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/adminAuth'
import { getTenantSummaries, type TenantStatus } from '@/lib/adminData'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: Request) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const url = new URL(req.url)
    const search = (url.searchParams.get('search') || '').trim().toLowerCase()
    const statusFilter = url.searchParams.get('status') as TenantStatus | 'all' | null
    const sort = url.searchParams.get('sort') || 'recent'
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20)
    )

    const allTenants = await getTenantSummaries()

    const counts = {
      all: allTenants.length,
      active: allTenants.filter((t) => t.status === 'active').length,
      pending: allTenants.filter((t) => t.status === 'pending').length,
      suspended: allTenants.filter((t) => t.status === 'suspended').length,
    }

    let tenants = allTenants
    if (statusFilter && statusFilter !== 'all') {
      tenants = tenants.filter((t) => t.status === statusFilter)
    }

    if (search) {
      tenants = tenants.filter(
        (t) =>
          (t.shopName || '').toLowerCase().includes(search) ||
          (t.ownerName || '').toLowerCase().includes(search) ||
          (t.phone || '').toLowerCase().includes(search) ||
          (t.email || '').toLowerCase().includes(search)
      )
    }

    tenants = [...tenants].sort((a, b) => {
      if (sort === 'lastActive') {
        const aTime = a.lastActive ? new Date(a.lastActive).getTime() : 0
        const bTime = b.lastActive ? new Date(b.lastActive).getTime() : 0
        return bTime - aTime
      }
      if (sort === 'name') {
        return (a.shopName || '').localeCompare(b.shopName || '')
      }
      const aDate = a.signupDate ? new Date(a.signupDate).getTime() : 0
      const bDate = b.signupDate ? new Date(b.signupDate).getTime() : 0
      return bDate - aDate
    })

    const total = tenants.length
    const start = (page - 1) * pageSize
    const pageItems = tenants.slice(start, start + pageSize)

    return NextResponse.json({ tenants: pageItems, total, page, pageSize, counts })
  } catch (err) {
    console.error('Admin tenants list error:', err)
    return NextResponse.json({ error: 'Failed to load tenants' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const shopName = String(body.shopName || '').trim()
    const ownerName = String(body.ownerName || '').trim()
    const phone = String(body.phone || '').trim()
    const email = String(body.email || '').trim().toLowerCase()

    if (!shopName || !email) {
      return NextResponse.json({ error: 'Business name and email are required' }, { status: 400 })
    }

    const tempPassword = randomBytes(9).toString('base64url')

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message || 'Failed to create tenant' }, { status: 400 })
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: created.user.id,
      shop_name: shopName,
      owner_name: ownerName || null,
      phone: phone || null,
    })
    if (profileError) throw profileError

    return NextResponse.json({
      tenant: {
        id: created.user.id,
        email: created.user.email,
        shopName,
        ownerName: ownerName || null,
        phone: phone || null,
      },
      tempPassword,
    })
  } catch (err) {
    console.error('Admin create tenant error:', err)
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }
}
