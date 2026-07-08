import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text)' }}>
          DawrBa<span style={{ color: 'var(--blue)', marginLeft: '4px' }}>.</span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--muted)', marginBottom: '32px', lineHeight: '1.6' }}>
          Track your customer credits and payments with ease. Manage your shop finances in one place.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" style={{ padding: '12px 32px', background: 'var(--blue)', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '1rem', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
            Login
          </Link>
          <Link href="/signup" style={{ padding: '12px 32px', background: 'transparent', color: 'var(--blue)', border: '2px solid var(--blue)', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '1rem', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  )
}
