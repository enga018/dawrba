'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(stored === 'dark' || (stored !== 'light' && systemDark))
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      className="header-btn"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    >
      <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
    </button>
  )
}
