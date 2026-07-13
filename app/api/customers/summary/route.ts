import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { recordApiCall } from '@/lib/performanceMonitoring'

/**
 * Server-side endpoint for fetching aggregated customer summaries
 * Much faster than client-side calculation
 */
export async function GET(req: Request) {
  const startTime = Date.now()
  const url = new URL(req.url).pathname

  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const search = searchParams.get('search') || ''
    const minBalance = searchParams.get('minBalance') ? parseInt(searchParams.get('minBalance')!) : null
    const maxBalance = searchParams.get('maxBalance') ? parseInt(searchParams.get('maxBalance')!) : null
    const createdAfter = searchParams.get('createdAfter') || null
    const createdBefore = searchParams.get('createdBefore') || null

    if (!userId) {
      const duration = Date.now() - startTime
      recordApiCall(url, 'GET', duration, 400, userId || undefined)
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Build query with filters
    let query = supabase
      .from('customers')
      .select('id, name, phone, opening_balance, created_at', { count: 'exact' })
      .eq('user_id', userId)

    // Add search filter (full-text search)
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Add date filters
    if (createdAfter) query = query.gte('created_at', createdAfter)
    if (createdBefore) query = query.lte('created_at', createdBefore)

    // Apply pagination and sorting
    const { data: customers, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false })

    const customerIds = (customers || []).map(c => c.id)

    // Get transactions for these customers in one query
    let txQuery = supabase
      .from('transactions')
      .select('customer_id, amount, created_at')
      .in('customer_id', customerIds)

    // Apply transaction filters
    if (minBalance !== null || maxBalance !== null) {
      // Note: This filters individual transactions; balance filtering happens after aggregation
    }

    const { data: transactions } = await txQuery

    // Calculate balances on server
    const balances: Record<string, number> = {}
    const lastTxDate: Record<string, string> = {}

    for (const t of transactions || []) {
      balances[t.customer_id] = (balances[t.customer_id] || 0) + (t.amount || 0)
      if (!lastTxDate[t.customer_id] || t.created_at > lastTxDate[t.customer_id]) {
        lastTxDate[t.customer_id] = t.created_at
      }
    }

    // Build summary response with balance filtering
    let summaries = (customers || []).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance: (c.opening_balance || 0) + (balances[c.id] || 0),
      lastTxDate: lastTxDate[c.id] || null,
      created_at: c.created_at,
    }))

    // Apply balance range filters
    if (minBalance !== null) {
      summaries = summaries.filter(s => s.balance >= minBalance)
    }
    if (maxBalance !== null) {
      summaries = summaries.filter(s => s.balance <= maxBalance)
    }

    const duration = Date.now() - startTime
    recordApiCall(url, 'GET', duration, 200, userId, {
      page,
      pageSize,
      customersCount: summaries.length,
      total: count || 0,
      hasSearch: !!search,
    })

    return NextResponse.json({
      data: summaries,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    const duration = Date.now() - startTime
    recordApiCall(url, 'GET', duration, 500, undefined, {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    console.error('Error fetching customer summaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer summaries' },
      { status: 500 }
    )
  }
}
