'use client'

import { usePathname } from 'next/navigation'

interface FloatingAddButtonProps {
  onClick: () => void
}

/* Floating add button for the (app) layout pages (Customers, Reports,
   Transactions). Opens the global Add modal (keypad flow).
   Mobile-only -- on desktop these pages keep their original no-FAB layout
   (see .add-btn-nav in globals.css). The home dashboard has its own FAB
   that opens the same modal, so this is not rendered there. */
export default function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  const pathname = usePathname()

  // Not on the first-run setup flow, nor on the add page itself.
  if (pathname === '/setup') return null
  // Customer detail pages render their own FAB that opens an in-page
  // Add Credit modal targeted at that customer.
  if (pathname.startsWith('/customers/')) return null
  // Settings and the activity log aren't places to add a transaction.
  if (pathname.startsWith('/profile') || pathname.startsWith('/log')) return null

  return (
    <button className="add-btn add-btn-nav" title="Add credit or customer" onClick={onClick}>
      <i className="fa-solid fa-plus"></i>
    </button>
  )
}
