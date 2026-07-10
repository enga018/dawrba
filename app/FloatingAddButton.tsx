'use client'

import { usePathname } from 'next/navigation'
import FabMenu from './FabMenu'

/* Floating add button for the (app) layout pages (Customers, Reports,
   Transactions). On hover it reveals a small menu with Add Credit /
   Collect Payment / Add Customer, each opening its own flow.
   Desktop-only (see .fab in globals.css). The home dashboard renders its
   own FabMenu, so this is not rendered there. */
export default function FloatingAddButton() {
  const pathname = usePathname()

  // Not on the first-run setup flow.
  if (pathname === '/setup') return null
  // Customer detail pages render their own Add Credit / Collect buttons.
  if (pathname.startsWith('/customers/')) return null
  // Settings and the activity log aren't places to add a transaction.
  if (pathname.startsWith('/profile') || pathname.startsWith('/log')) return null

  return <FabMenu />
}
