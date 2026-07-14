'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BottomNavProps {
  onAddClick?: () => void
}

export default function BottomNav({ onAddClick }: BottomNavProps) {
  const pathname = usePathname()

  if (pathname === '/setup') return null

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="bottom-nav">
      <Link href="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
        <i className="fa-solid fa-chart-line"></i>
        <span>Dashboard</span>
      </Link>
      <Link href="/customers" className={`bottom-nav-item ${isActive('/customers') ? 'active' : ''}`}>
        <i className="fa-solid fa-users"></i>
        <span>Customers</span>
      </Link>
      <button className="bottom-nav-item bottom-nav-item-add" onClick={onAddClick}>
        <span className="bottom-nav-add-icon">
          <i className="fa-solid fa-plus"></i>
        </span>
      </button>
      <Link href="/reports" className={`bottom-nav-item ${isActive('/reports') ? 'active' : ''}`}>
        <i className="fa-solid fa-chart-pie"></i>
        <span>Reports</span>
      </Link>
      <Link href="/settings" className={`bottom-nav-item ${isActive('/settings') ? 'active' : ''}`}>
        <i className="fa-solid fa-gear"></i>
        <span>Settings</span>
      </Link>
    </nav>
  )
}
