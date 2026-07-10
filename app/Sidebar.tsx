'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  if (pathname === '/setup') return null

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link href="/" className="sidebar-logo">
          DawrBa<span className="dot"></span>
        </Link>
      </div>
      <nav className="sidebar-nav">
        <Link href="/" className={`sidebar-item ${isActive('/') ? 'active' : ''}`}>
          <i className="fa-solid fa-house"></i>
          <span>Home</span>
        </Link>
        <Link href="/customers" className={`sidebar-item ${isActive('/customers') ? 'active' : ''}`}>
          <i className="fa-solid fa-users"></i>
          <span>Customers</span>
        </Link>
        <Link href="/add-customer" className={`sidebar-item sidebar-item-add ${isActive('/add-customer') ? 'active' : ''}`}>
          <i className="fa-solid fa-plus"></i>
          <span>Add</span>
        </Link>
        <Link href="/reports" className={`sidebar-item ${isActive('/reports') ? 'active' : ''}`}>
          <i className="fa-solid fa-chart-pie"></i>
          <span>Reports</span>
        </Link>
        <Link href="/profile" className={`sidebar-item ${isActive('/profile') ? 'active' : ''}`}>
          <i className="fa-solid fa-user"></i>
          <span>Profile</span>
        </Link>
      </nav>
    </aside>
  )
}
