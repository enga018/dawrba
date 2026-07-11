'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="admin-bottom-nav">
      <Link href="/admin" className={`admin-bottom-nav-item ${isActive('/admin') ? 'active' : ''}`}>
        <i className="fa-solid fa-chart-line"></i>
        <span>Overview</span>
      </Link>

      <Link href="/admin/tenants" className={`admin-bottom-nav-item ${isActive('/admin/tenants') ? 'active' : ''}`}>
        <i className="fa-solid fa-store"></i>
        <span>Tenants</span>
      </Link>

      <Link href="/admin/reports" className={`admin-bottom-nav-item ${isActive('/admin/reports') ? 'active' : ''}`}>
        <i className="fa-solid fa-chart-pie"></i>
        <span>Reports</span>
      </Link>

      <Link href="/admin/settings" className={`admin-bottom-nav-item ${isActive('/admin/settings') ? 'active' : ''}`}>
        <i className="fa-solid fa-gear"></i>
        <span>Settings</span>
      </Link>

      <button className="admin-bottom-nav-item" onClick={handleLogout}>
        <i className="fa-solid fa-right-from-bracket"></i>
        <span>Logout</span>
      </button>
    </nav>
  )
}