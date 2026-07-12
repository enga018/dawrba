'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/setup') return null

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link href="/" className="sidebar-logo">
          DawrBa<span className="dot"></span>
        </Link>
      </div>
      <nav className="sidebar-nav">
        <Link href="/" className={`sidebar-item ${isActive('/') ? 'active' : ''}`}>
          <i className="fa-solid fa-chart-line"></i>
          <span>Dashboard</span>
        </Link>
        <Link href="/customers" className={`sidebar-item ${isActive('/customers') ? 'active' : ''}`}>
          <i className="fa-solid fa-users"></i>
          <span>Customers</span>
        </Link>
        <Link href="/reports" className={`sidebar-item ${isActive('/reports') ? 'active' : ''}`}>
          <i className="fa-solid fa-chart-pie"></i>
          <span>Reports</span>
        </Link>
        <Link href="/settings" className={`sidebar-item ${isActive('/settings') ? 'active' : ''}`}>
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
