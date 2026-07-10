'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/lib/toast'

export default function ExportDataPage() {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, phone, opening_balance, created_at')
        .eq('user_id', user.id)

      const customerIds = (customers || []).map((c) => c.id)

      const { data: transactions } = await supabase
        .from('transactions')
        .select('customer_id, amount, note, date, created_at')
        .in('customer_id', customerIds)

      const csv = buildCsv(customers || [], transactions || [])
      downloadCsv(csv, 'dawrba-export.csv')
      showToast('Data exported successfully')
    } catch {
      showToast('Export failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Link href="/profile">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Export Data</h2>
        </div>
      </Link>

      <div className="detail-card">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <i className="fa-solid fa-download" style={{ fontSize: '2rem', color: 'var(--blue)', marginBottom: '12px', display: 'block' }}></i>
          <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '8px' }}>Download Backup</p>
          <p style={{ color: 'var(--meta)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Export all your customers and transactions as a CSV file.
          </p>
          <button
            className="btn btn-primary btn-block"
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? <span className="spinner"></span> : 'Export CSV'}
          </button>
        </div>
      </div>
    </>
  )
}

function buildCsv(
  customers: Array<{ id: string; name: string; phone?: string; opening_balance: number; created_at: string }>,
  transactions: Array<{ customer_id: string; amount: number; note?: string; date?: string; created_at: string }>
): string {
  const customerMap = new Map(customers.map((c) => [c.id, c]))
  const rows = [
    ['Customer', 'Phone', 'Amount', 'Note', 'Date', 'Created At'],
  ]

  for (const tx of transactions) {
    const c = customerMap.get(tx.customer_id)
    rows.push([
      c?.name || '',
      c?.phone || '',
      String(tx.amount),
      tx.note || '',
      tx.date || '',
      tx.created_at,
    ])
  }

  return rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
