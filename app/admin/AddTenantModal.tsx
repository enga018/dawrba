'use client'

import { useState } from 'react'
import { adminFetchJson } from '@/lib/adminApiClient'

export default function AddTenantModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [shopName, setShopName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await adminFetchJson<{ tenant: { id: string }; tempPassword: string }>('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName, ownerName, phone, email }),
      })
      setResult({ email, tempPassword: res.tempPassword })
      setCreatedId(res.tenant.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tenant')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop active" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add Tenant</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {result ? (
          <div>
            <p style={{ color: 'var(--muted)', marginBottom: 12 }}>
              Tenant account created. Share these temporary credentials with the tenant.
            </p>
            <div className="detail-card" style={{ marginBottom: 16 }}>
              <div className="field">
                <label>Email</label>
                <input type="text" value={result.email} readOnly />
              </div>
              <div className="field">
                <label>Temporary Password</label>
                <input type="text" value={result.tempPassword} readOnly />
              </div>
            </div>
            <button className="btn btn-primary btn-block" onClick={() => createdId && onCreated(createdId)}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="at-shop-name">Business Name</label>
              <input id="at-shop-name" type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="at-owner-name">Owner Name</label>
              <input id="at-owner-name" type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="at-phone">Phone</label>
              <input id="at-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="at-email">Email</label>
              <input id="at-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={saving} style={{ marginTop: 8 }}>
              {saving ? <span className="spinner"></span> : 'Create Tenant'}
            </button>
            {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
          </form>
        )}
      </div>
    </div>
  )
}
