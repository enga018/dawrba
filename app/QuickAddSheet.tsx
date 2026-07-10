'use client'

import { useRouter } from 'next/navigation'

interface QuickAddSheetProps {
  show: boolean
  onClose: () => void
}

export default function QuickAddSheet({ show, onClose }: QuickAddSheetProps) {
  const router = useRouter()

  const handleSelect = (mode: string) => {
    onClose()
    router.push(`/add-customer?mode=${mode}`)
  }

  return (
    <div className={`modal-backdrop ${show ? 'active' : ''}`} onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="quick-add-title">
            <i className="fa-solid fa-circle-plus" style={{ color: 'var(--blue)' }}></i>
            <h3>Add Transaction</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="quick-add-list">
          <button className="quick-add-row" onClick={() => handleSelect('credit')}>
            <div className="quick-add-icon green">
              <i className="fa-solid fa-plus"></i>
            </div>
            <div className="quick-add-info">
              <span className="quick-add-name">Add Credit</span>
              <span className="quick-add-desc">Give goods on credit</span>
            </div>
            <i className="fa-solid fa-chevron-right quick-add-arrow"></i>
          </button>

          <button className="quick-add-row" onClick={() => handleSelect('payment')}>
            <div className="quick-add-icon blue">
              <i className="fa-solid fa-check"></i>
            </div>
            <div className="quick-add-info">
              <span className="quick-add-name">Collect Payment</span>
              <span className="quick-add-desc">Receive money</span>
            </div>
            <i className="fa-solid fa-chevron-right quick-add-arrow"></i>
          </button>

          <button className="quick-add-row" onClick={() => handleSelect('new')}>
            <div className="quick-add-icon purple">
              <i className="fa-solid fa-user-plus"></i>
            </div>
            <div className="quick-add-info">
              <span className="quick-add-name">Add Customer</span>
              <span className="quick-add-desc">Create new customer</span>
            </div>
            <i className="fa-solid fa-chevron-right quick-add-arrow"></i>
          </button>
        </div>
      </div>
    </div>
  )
}
