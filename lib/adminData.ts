import 'server-only'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export interface TenantSummary {
  id: string
  email: string | null
  shopName: string | null
  phone: string | null
  signupDate: string | null
  customerCount: number
  transactionCount: number
  lastActivity: string | null
}

async function listAllUsers(): Promise<{ id: string; email: string | null; created_at: string }[]> {
  const users: { id: string; email: string | null; created_at: string }[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    for (const u of data.users) {
      users.push({ id: u.id, email: u.email ?? null, created_at: u.created_at })
    }

    if (!data.nextPage || data.users.length < perPage) break
    page = data.nextPage
  }

  return users
}

export async function getTenantSummaries(): Promise<TenantSummary[]> {
  const [users, profilesResult, customersResult] = await Promise.all([
    listAllUsers(),
    supabaseAdmin.from('profiles').select('id, shop_name, phone'),
    supabaseAdmin.from('customers').select('id, user_id'),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (customersResult.error) throw customersResult.error

  const profiles = (profilesResult.data || []) as { id: string; shop_name: string | null; phone: string | null }[]
  const customers = (customersResult.data || []) as { id: string; user_id: string }[]

  const customerToUser: Record<string, string> = {}
  const customerCountByUser: Record<string, number> = {}
  for (const c of customers) {
    customerToUser[c.id] = c.user_id
    customerCountByUser[c.user_id] = (customerCountByUser[c.user_id] || 0) + 1
  }

  const customerIds = customers.map((c) => c.id)
  const transactionCountByUser: Record<string, number> = {}
  const lastActivityByUser: Record<string, string> = {}

  if (customerIds.length > 0) {
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('customer_id, created_at')
      .in('customer_id', customerIds)
    if (txError) throw txError

    const txList = (transactions || []) as { customer_id: string; created_at: string }[]

    for (const t of txList) {
      const userId = customerToUser[t.customer_id]
      if (!userId) continue
      transactionCountByUser[userId] = (transactionCountByUser[userId] || 0) + 1
      const existing = lastActivityByUser[userId]
      if (!existing || new Date(t.created_at) > new Date(existing)) {
        lastActivityByUser[userId] = t.created_at
      }
    }
  }

  const profileById: Record<string, { shop_name: string | null; phone: string | null }> = {}
  for (const p of profiles) {
    profileById[p.id] = { shop_name: p.shop_name, phone: p.phone }
  }

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    shopName: profileById[u.id]?.shop_name ?? null,
    phone: profileById[u.id]?.phone ?? null,
    signupDate: u.created_at,
    customerCount: customerCountByUser[u.id] || 0,
    transactionCount: transactionCountByUser[u.id] || 0,
    lastActivity: lastActivityByUser[u.id] || null,
  }))
}
