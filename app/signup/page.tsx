'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password) {
        throw new Error('Email and password are required')
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        console.error('Signup error:', authError)
        throw authError
      }

      if (!data.user) {
        throw new Error('Signup failed - no user created')
      }

      console.log('Signup successful, redirecting to setup...')
      router.push('/setup')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Signup failed'
      console.error('Signup error:', errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="logo">
        DawrBa<span className="dot"></span>
      </div>
      <form onSubmit={handleSignup}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading}
        >
          {loading ? <span className="spinner"></span> : 'Sign up'}
        </button>
        {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
      </form>
      <div className="auth-toggle">
        <span>Already have an account?</span>
        <Link href="/login" style={{ marginLeft: '4px' }}>
          Login
        </Link>
      </div>
    </div>
  )
}
