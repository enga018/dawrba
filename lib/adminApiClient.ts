import { supabase } from '@/lib/supabase'

export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers = new Headers(init.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  return fetch(path, { ...init, headers })
}

export async function adminFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed with ${res.status}`)
  }
  return res.json()
}
