'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { showToast } from '@/lib/toast'

export default function SettingsPage() {
  const [shopName, setShopName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const loadProfile = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email || '')

      const { data } = await supabase
        .from('profiles')
        .select('shop_name')
        .eq('id', user.id)
        .single()

      if (data?.shop_name) {
        setShopName(data.shop_name)
      }
      setLoading(false)
    }
    loadProfile()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')

      const { error: dbError } = await supabase.from('profiles').upsert({
        id: user.id,
        shop_name: shopName,
      })

      if (dbError) throw dbError
      showToast('Settings saved')
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  return (
    <>
      <Link href="/">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Settings</h2>
        </div>
      </Link>

      <div className="detail-card">
        <form onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="shopName">Shop name</label>
            <input
              type="text"
              id="shopName"
              placeholder="e.g. Shahid's Tea Stall"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              disabled
              style={{ background: '#f1f5f9', color: 'var(--meta)' }}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? <span className="spinner"></span> : 'Save Settings'}
          </button>
          {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
        </form>
      </div>

      <div style={{ marginTop: '24px' }}>
        <button className="btn btn-secondary btn-block" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket"></i> Sign Out
        </button>
      </div>
    </>
  )
}
