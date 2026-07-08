import type { Metadata } from 'next'
import LandingClient from './LandingClient'

export const metadata: Metadata = {
  title: 'DawrBa — Track Credit. Get Paid Faster.',
}

export default function Home() {
  return <LandingClient />
}
