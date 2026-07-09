'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LandingPage from './LandingPage'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        router.push('/daily-summary')
      }
    }

    checkAuth()
  }, [router])

  return <LandingPage />
}