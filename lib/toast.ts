type ToastType = 'success' | 'error' | 'info'

interface ToastEventDetail {
  message: string
  type: ToastType
}

const TOAST_EVENT = 'dawrba-toast'

export function showToast(message: string, type: ToastType = 'success') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<ToastEventDetail>(TOAST_EVENT, { detail: { message, type } })
  )
}
