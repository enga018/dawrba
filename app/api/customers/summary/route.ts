import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Server-side endpoint for fetching aggregated customer summaries
 * Much faster than client-side calculation
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Get customers with pagination
    const { data: customers, count } = await supabase
      .from('customers')
      .select('id, name, phone, opening_balance, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .range(from, to)
      .order('created_at', { ascending: false })

    const customerIds = (customers || []).map(c => c.id)

    // Get transactions for these customers in one query
    const { data: transactions } = await supabase
      .from('transactions')
      .select('customer_id, amount, created_at')
      .in('customer_id', customerIds)

    // Calculate balances on server
    const balances: Record<string, number> = {}
    const lastTxDate: Record<string, string> = {}

    for (const t of transactions || []) {
      balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)
      if (!lastTxDate[t.customer_id] || t.created_at > lastTxDate[t.customer_id]) {
        lastTxDate[t.customer_id] = t.created_at
      }
    }

    // Build summary response
    const summaries = (customers || []).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance: (c.opening_balance || 0) + (balances[c.id] || 0),
      lastTxDate: lastTxDate[c.id] || null,
      created_at: c.created_at,
    }))

    return NextResponse.json({
      data: summaries,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error('Error fetching customer summaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer summaries' },
      { status: 500 }
    )
  }
}
