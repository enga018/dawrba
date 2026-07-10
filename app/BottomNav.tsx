'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  if (pathname === '/setup') return null

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="bottom-nav">
      <Link href="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
        <i className="fa-solid fa-house"></i>
        <span>Home</span>
      </Link>
      <Link href="/customers" className={`bottom-nav-item ${isActive('/customers') ? 'active' : ''}`}>
        <i className="fa-solid fa-users"></i>
        <span>Customers</span>
      </Link>
      <Link href="/add-customer" className="bottom-nav-add" title="Add">
        <i className="fa-solid fa-plus"></i>
      </Link>
      <Link href="/reports" className={`bottom-nav-item ${isActive('/reports') ? 'active' : ''}`}>
        <i className="fa-solid fa-calendar-day"></i>
        <span>Reports</span>
      </Link>
      <Link href="/settings" className={`bottom-nav-item ${isActive('/settings') ? 'active' : ''}`}>
        <i className="fa-solid fa-gear"></i>
        <span>Settings</span>
      </Link>
    </nav>
  )
}
