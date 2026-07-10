import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/adminAuth'
import { getTenantSummaries } from '@/lib/adminData'

export async function GET(req: Request) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const url = new URL(req.url)
    const search = (url.searchParams.get('search') || '').trim().toLowerCase()
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20)
    )

    let tenants = await getTenantSummaries()

    if (search) {
      tenants = tenants.filter(
        (t) =>
          (t.shopName || '').toLowerCase().includes(search) ||
          (t.phone || '').toLowerCase().includes(search) ||
          (t.email || '').toLowerCase().includes(search)
      )
    }

    tenants.sort((a, b) => {
      const aDate = a.signupDate ? new Date(a.signupDate).getTime() : 0
      const bDate = b.signupDate ? new Date(b.signupDate).getTime() : 0
      return bDate - aDate
    })

    const total = tenants.length
    const start = (page - 1) * pageSize
    const pageItems = tenants.slice(start, start + pageSize)

    return NextResponse.json({ tenants: pageItems, total, page, pageSize })
  } catch (err) {
    console.error('Admin tenants list error:', err)
    return NextResponse.json({ error: 'Failed to load tenants' }, { status: 500 })
  }
}
