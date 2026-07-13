'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

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

      <Link href="/admin/activity" className={`admin-bottom-nav-item ${isActive('/admin/activity') ? 'active' : ''}`}>
        <i className="fa-solid fa-bolt"></i>
        <span>Activity</span>
      </Link>

      <Link href="/admin/settings" className={`admin-bottom-nav-item ${isActive('/admin/settings') ? 'active' : ''}`}>
        <i className="fa-solid fa-gear"></i>
        <span>Settings</span>
      </Link>
    </nav>
  )
}