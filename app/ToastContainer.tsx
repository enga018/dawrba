'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
  id: number
}

let toastId = 0

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string; type: 'success' | 'error' | 'info' }
      const id = ++toastId
      setToasts((prev) => [...prev, { ...detail, id }])
      const timer = setTimeout(() => removeToast(id), 2500)
      timers.current.set(id, timer)
    }
    window.addEventListener('dawrba-toast', handler)
    return () => window.removeEventListener('dawrba-toast', handler)
  }, [removeToast])

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-item toast-${t.type}`}
          onClick={() => removeToast(t.id)}
        >
          {t.type === 'success' && <i className="fa-solid fa-check-circle"></i>}
          {t.type === 'error' && <i className="fa-solid fa-circle-exclamation"></i>}
          {t.type === 'info' && <i className="fa-solid fa-circle-info"></i>}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
