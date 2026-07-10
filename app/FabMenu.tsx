'use client'

import { useState } from 'react'

interface FabItem {
  label: string
  mode: 'credit' | 'payment' | 'new'
  iconClass: string
  icon: string
}

const ITEMS: FabItem[] = [
  { label: 'Add Credit', mode: 'credit', iconClass: 'green', icon: 'fa-plus' },
  { label: 'Collect Payment', mode: 'payment', iconClass: 'blue', icon: 'fa-check' },
  { label: 'Add Customer', mode: 'new', iconClass: 'orange', icon: 'fa-user-plus' },
]

interface FabMenuProps {
  onSelect: (mode: 'credit' | 'payment' | 'new') => void
}

export default function FabMenu({ onSelect }: FabMenuProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (mode: 'credit' | 'payment' | 'new') => {
    setOpen(false)
    onSelect(mode)
  }

  return (
    <div className={`fab ${open ? 'open' : ''}`} onMouseLeave={() => setOpen(false)}>
      <div className="fab-menu">
        {ITEMS.map((item) => (
          <button
            key={item.mode}
            className="fab-item"
            onClick={() => handleSelect(item.mode)}
          >
            <span className={`fab-item-icon ${item.iconClass}`}>
              <i className={`fa-solid ${item.icon}`}></i>
            </span>
            <span className="fab-item-label">{item.label}</span>
          </button>
        ))}
      </div>
      <button
        className="fab-main"
        title="Add"
        aria-label="Add"
        onClick={() => setOpen((v) => !v)}
      >
        <i className="fa-solid fa-plus"></i>
      </button>
    </div>
  )
}
