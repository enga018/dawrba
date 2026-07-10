'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/* Floating add button for the (app) layout pages (Customers, Reports,
   Settings, detail pages). Routes to the standalone /add-customer page.
   Mobile-only -- on desktop these pages keep their original no-FAB layout
   (see .add-btn-nav in globals.css). The home dashboard has its own FAB
   that opens an in-page modal, so this is not rendered there. */
export default function FloatingAddButton() {
  const pathname = usePathname()

  // Not on the first-run setup flow, nor on the add page itself.
  if (pathname === '/setup' || pathname.startsWith('/add-customer')) return null
  // Customer detail pages render their own FAB that opens an in-page
  // Add Credit modal targeted at that customer.
  if (pathname.startsWith('/customers/')) return null
  // Settings and the activity log aren't places to add a transaction.
  if (pathname.startsWith('/settings') || pathname.startsWith('/log')) return null

  return (
    <Link href="/add-customer" className="add-btn add-btn-nav" title="Add credit or customer">
      <i className="fa-solid fa-plus"></i>
    </Link>
  )
}
