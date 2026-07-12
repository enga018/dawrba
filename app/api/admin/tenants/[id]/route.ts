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
      .select('shop_name, phone, weekly_report_day, overdue_threshold_days')
      .eq('id', id)
      .single()
    const profile = (profileData as { shop_name: string | null; phone: string | null; weekly_report_day: number | null; overdue_threshold_days: number | null } | null)
    if (profileError) throw profileError

    const { data: rawCustomers, error: customersError } = await supabaseAdmin
      .from('customers')
      .select('id, name, phone, opening_balance, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
    if (customersError) throw customersError

    const customers = (rawCustomers || []) as { id: string; name: string; phone: string | null; opening_balance: number; created_at: string }[]
    const customerIds = customers.map((c) => c.id)
    let recentTransactions: Array<{
      id: string
      customer_id: string
      amount: number
      note: string | null
      date: string | null
      created_at: string
    }> = []

    if (customerIds.length > 0) {
      const { data: txData, error: txError } = await supabaseAdmin
        .from('transactions')
        .select('id, customer_id, amount, note, date, created_at')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false })
        .limit(50)
      if (txError) throw txError
      recentTransactions = (txData || []) as Array<{
        id: string; customer_id: string; amount: number; note: string | null; date: string | null; created_at: string
      }>
    }

    const customerNameById: Record<string, string> = {}
    for (const c of customers || []) {
      customerNameById[c.id] = c.name
    }

    return NextResponse.json({
      profile: {
        id,
        email: userData.user.email,
        signupDate: userData.user.created_at,
        shopName: profile?.shop_name ?? null,
        phone: profile?.phone ?? null,
      },
      customers: customers || [],
      recentTransactions: recentTransactions.map((t) => ({
        ...t,
        customerName: customerNameById[t.customer_id] || 'Unknown',
      })),
    })
  } catch (err) {
    console.error('Admin tenant detail error:', err)
    return NextResponse.json({ error: 'Failed to load tenant' }, { status: 500 })
  }
}
