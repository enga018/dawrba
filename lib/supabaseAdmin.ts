import 'server-only'
import { createClient } from '@supabase/supabase-js'

let supabaseAdminInstance: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (supabaseAdminInstance) return supabaseAdminInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return supabaseAdminInstance
}

export const supabaseAdmin = new Proxy(
  {},
  {
    get: (_, prop) => {
      const admin = getSupabaseAdmin()
      return (admin as any)[prop]
    },
  }
) as ReturnType<typeof createClient>
