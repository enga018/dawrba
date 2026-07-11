'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { offlineWrite } from '@/lib/offline'

export default function Setup() {
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')

      const result = await offlineWrite(
        async () => {
          const { error } = await supabase.from('profiles').upsert({ id: user.id, shop_name: shopName })
          if (error) throw error
          return { data: null, error: null }
        },
        { table: 'profiles', operation: 'upsert', data: { id: user.id, shop_name: shopName } }
      )
      if (result?.error) throw result.error
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-card">
      <h2>Name your shop</h2>
      <p>This will appear at the top of your dashboard.</p>
      <form onSubmit={handleSetup}>
        <div className="field">
          <input
            type="text"
            placeholder="e.g. Shahid's Tea Stall"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? <span className="spinner"></span> : 'Continue'}
        </button>
        {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
      </form>
    </div>
  )
}
