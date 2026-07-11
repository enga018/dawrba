'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

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
      </nav>
    </aside>
  )
}
