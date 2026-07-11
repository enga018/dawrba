'use client'

import { useState, useEffect } from 'react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const handleOffline = () => setOffline(true)
    const handleOnline = () => setOffline(false)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    setOffline(!navigator.onLine)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div style={{
      background: 'var(--orange)',
      color: 'white',
      textAlign: 'center',
      padding: '6px 16px',
      fontSize: '0.8rem',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <i className="fa-solid fa-wifi-slash" style={{ fontSize: '0.75rem' }}></i>
      <span>You are offline — showing cached data</span>
    </div>
  )
}
