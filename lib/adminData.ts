import 'server-only'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type TenantStatus = 'active' | 'suspended' | 'pending'
export type TenantHealth = 'healthy' | 'idle' | 'issue'

export interface TenantSummary {
  id: string
  email: string | null
  shopName: string | null
  ownerName: string | null
  phone: string | null
  signupDate: string | null
  customerCount: number
  lastActive: string | null
  emailConfirmed: boolean
  status: TenantStatus
  health: TenantHealth
}

interface AuthUserRow {
  id: string
  email: string | null
  created_at: string
  email_confirmed_at: string | null
  last_sign_in_at: string | null
}

async function listAllUsers(): Promise<AuthUserRow[]> {
  const users: AuthUserRow[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    for (const u of data.users) {
      users.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
      })
    }

    if (!data.nextPage || data.users.length < perPage) break
    page = data.nextPage
  }

  return users
}

function computeHealth(isSuspended: boolean, lastActive: string | null): TenantHealth {
  if (isSuspended) return 'issue'
  if (!lastActive) return 'idle'
  const daysAgo = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
  if (daysAgo >= 7) return 'idle'
  return 'healthy'
}

export async function getTenantSummaries(): Promise<TenantSummary[]> {
  const [users, profilesResult, customersResult] = await Promise.all([
    listAllUsers(),
    supabaseAdmin
      .from('profiles')
      .select('id, shop_name, owner_name, phone, is_platform_admin, is_suspended'),
    supabaseAdmin.from('customers').select('id, user_id, created_at'),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (customersResult.error) throw customersResult.error

  const profiles = (profilesResult.data || []) as {
    id: string
    shop_name: string | null
    owner_name: string | null
    phone: string | null
    is_platform_admin: boolean
    is_suspended: boolean
  }[]
  const customers = (customersResult.data || []) as { id: string; user_id: string; created_at: string }[]

  const adminIds = new Set(profiles.filter((p) => p.is_platform_admin).map((p) => p.id))

  const customerToUser: Record<string, string> = {}
  const customerCountByUser: Record<string, number> = {}
  for (const c of customers) {
    customerToUser[c.id] = c.user_id
    customerCountByUser[c.user_id] = (customerCountByUser[c.user_id] || 0) + 1
  }

  const customerIds = customers.map((c) => c.id)
  const lastTxActivityByUser: Record<string, string> = {}

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
      const existing = lastTxActivityByUser[userId]
      if (!existing || new Date(t.created_at) > new Date(existing)) {
        lastTxActivityByUser[userId] = t.created_at
      }
    }
  }

  const profileById: Record<string, { shop_name: string | null; owner_name: string | null; phone: string | null; is_suspended: boolean }> = {}
  for (const p of profiles) {
    profileById[p.id] = { shop_name: p.shop_name, owner_name: p.owner_name, phone: p.phone, is_suspended: p.is_suspended }
  }

  return users
    .filter((u) => !adminIds.has(u.id))
    .map((u) => {
      const profile = profileById[u.id]
      const isSuspended = profile?.is_suspended ?? false
      const shopName = profile?.shop_name ?? null

      const lastActive = [u.last_sign_in_at, lastTxActivityByUser[u.id]]
        .filter((d): d is string => !!d)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null

      const status: TenantStatus = isSuspended ? 'suspended' : !shopName ? 'pending' : 'active'

      return {
        id: u.id,
        email: u.email,
        shopName,
        ownerName: profile?.owner_name ?? null,
        phone: profile?.phone ?? null,
        signupDate: u.created_at,
        customerCount: customerCountByUser[u.id] || 0,
        lastActive,
        emailConfirmed: !!u.email_confirmed_at,
        status,
        health: computeHealth(isSuspended, lastActive),
      }
    })
}
