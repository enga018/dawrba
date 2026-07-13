import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/adminAuth'
import { getTenantSummaries } from '@/lib/adminData'

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export async function GET(req: Request) {
  const auth = await requirePlatformAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const tenants = await getTenantSummaries()

    const header = ['Business Name', 'Owner Name', 'Phone', 'Registered Date', 'Last Active', 'Status', 'Customers']
    const rows = tenants.map((t) => [
      t.shopName || '',
      t.ownerName || '',
      t.phone || '',
      t.signupDate ? t.signupDate.slice(0, 10) : '',
      t.lastActive ? t.lastActive.slice(0, 10) : '',
      t.status,
      String(t.customerCount),
    ])

    const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tenants-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (err) {
    console.error('Admin export error:', err)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
