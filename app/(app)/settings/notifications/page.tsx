'use client'

export default function NotificationsPage() {
  return (
    <>
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
