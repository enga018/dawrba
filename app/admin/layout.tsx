'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'ok'>('checking')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let cancelled = false

    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_platform_admin')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_platform_admin) {
        router.push('/')
        return
      }

      if (!cancelled) setStatus('ok')
    }

    checkAccess()

    return () => {
      cancelled = true
    }
  }, [router])

  if (status !== 'ok') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--blue)' }}></div>
      </div>
    )
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <span className="admin-brand">
          DawrBa<span className="dot"></span> Admin
        </span>
        <nav className="admin-nav">
          <Link href="/admin" className={`admin-nav-link ${pathname === '/admin' ? 'active' : ''}`}>
            Overview
          </Link>
          <Link
            href="/admin/tenants"
            className={`admin-nav-link ${pathname?.startsWith('/admin/tenants') ? 'active' : ''}`}
          >
            Tenants
          </Link>
        </nav>
        <button
          className="header-logout-btn"
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
        >
          <i className="fa-solid fa-right-from-bracket"></i>
        </button>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  )
}
