'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link href="/admin" className="sidebar-logo">
          DawrBa<span className="dot"></span> Admin
        </Link>
      </div>

      <nav className="sidebar-nav">
        <Link href="/admin" className={`sidebar-item ${isActive('/admin') ? 'active' : ''}`}>
          <i className="fa-solid fa-chart-line"></i>
          <span>Overview</span>
        </Link>

        <Link href="/admin/tenants" className={`sidebar-item ${isActive('/admin/tenants') ? 'active' : ''}`}>
          <i className="fa-solid fa-store"></i>
          <span>Tenants</span>
        </Link>

        <Link href="/admin/reports" className={`sidebar-item ${isActive('/admin/reports') ? 'active' : ''}`}>
          <i className="fa-solid fa-chart-pie"></i>
          <span>Reports</span>
        </Link>

        <Link href="/admin/settings" className={`sidebar-item ${isActive('/admin/settings') ? 'active' : ''}`}>
          <i className="fa-solid fa-gear"></i>
          <span>Settings</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-item sidebar-logout" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket"></i>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
