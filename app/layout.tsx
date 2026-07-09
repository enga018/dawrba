import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'
import ToastContainer from './ToastContainer'

export const metadata: Metadata = {
  title: 'DawrBa',
  description: 'Customer credit and payment tracker',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DawrBa',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  )
}
