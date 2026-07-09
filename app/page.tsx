import type { Metadata } from 'next'
import DashboardPage from './DashboardPage'
import LandingPage from './LandingPage'
import { getCurrentUser } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'DawrBa — Track Credit. Get Paid Faster.',
}

export default function Home() {
  return <LandingPage />
}