'use client'

interface AddTransactionPickerProps {
  show: boolean
  onClose: () => void
  onSelect: (mode: 'credit' | 'payment' | 'new') => void
}

const ITEMS: Array<{ mode: 'credit' | 'payment' | 'new'; title: string; sub: string; icon: string; tint: string; color: string }> = [
  { mode: 'credit', title: 'Add Credit', sub: 'Give goods on credit', icon: 'fa-plus', tint: 'var(--tint-green)', color: 'var(--green)' },
  { mode: 'payment', title: 'Collect Payment', sub: 'Receive money', icon: 'fa-check', tint: 'var(--tint-blue)', color: 'var(--blue)' },
  { mode: 'new', title: 'Add Customer', sub: 'Create new customer', icon: 'fa-user-plus', tint: 'var(--tint-orange)', color: 'var(--orange)' },
]

export default function AddTransactionPicker({ show, onClose, onSelect }: AddTransactionPickerProps) {
  const close = () => onClose()

  return (
    <div className={`modal-backdrop ${show ? 'active' : ''}`} onClick={close}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add Transaction</h3>
          <button className="modal-close" onClick={close} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="profile-menu">
          {ITEMS.map((item) => (
            <button
              key={item.mode}
              className="profile-menu-item"
              onClick={() => onSelect(item.mode)}
            >
              <div className="profile-menu-icon" style={{ background: item.tint, color: item.color }}>
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
              <div className="profile-menu-text">
                <div className="profile-menu-title">{item.title}</div>
                <div className="profile-menu-sub">{item.sub}</div>
              </div>
              <i className="fa-solid fa-chevron-right profile-menu-chevron"></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
