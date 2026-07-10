'use client'

import Link from 'next/link'

export default function NotificationsPage() {
  return (
    <>
      <Link href="/profile">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Notifications</h2>
        </div>
      </Link>

      <div className="detail-card">
        <div className="empty" style={{ padding: '40px 0' }}>
          <i className="fa-solid fa-bell" style={{ fontSize: '2rem', color: 'var(--meta)', marginBottom: '12px' }}></i>
          <p style={{ color: 'var(--muted)', fontWeight: 600 }}>Coming Soon</p>
          <p style={{ color: 'var(--meta)', fontSize: '0.85rem' }}>
            Reminder and alert notifications will be available here.
          </p>
        </div>
      </div>
    </>
  )
}
