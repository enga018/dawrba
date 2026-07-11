'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminNavbar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="admin-navbar">
      <Link href="/admin" className={`admin-navbar-item ${isActive('/admin') ? 'active' : ''}`}>
        <i className="fa-solid fa-chart-line"></i>
        <span>Overview</span>
      </Link>
      <Link href="/admin/tenants" className={`admin-navbar-item ${isActive('/admin/tenants') ? 'active' : ''}`}>
        <i className="fa-solid fa-store"></i>
        <span>Tenants</span>
      </Link>
      <button className="admin-navbar-item admin-navbar-logout" onClick={handleLogout}>
        <i className="fa-solid fa-right-from-bracket"></i>
        <span>Logout</span>
      </button>
    </nav>
  )
}