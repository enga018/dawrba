'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(() => {
          console.log('[SW] Registered')
        })
        .catch((err) => {
          console.error('[SW] Registration failed:', err)
        })
    }
  }, [])

  return null
}
