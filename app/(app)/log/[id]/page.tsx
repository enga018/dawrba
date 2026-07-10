'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatLogEntry, type LogEntry } from '@/lib/transactionLog'

export default function CustomerTransactionLogPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [customerName, setCustomerName] = useState('')
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: customerData } = await supabase
        .from('customers')
        .select('name')
        .eq('id', customerId)
        .eq('user_id', user.id)
        .single()

      if (customerData) setCustomerName(customerData.name)

      const { data, error } = await supabase
        .from('transaction_logs')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading transaction log:', error)
      } else {
        setEntries(data || [])
      }
      setLoading(false)
    }
    load()
  }, [customerId, router])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    )
  }

  return (
    <>
      <Link href={`/customers/${customerId}`}>
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>{customerName ? `${customerName} — Transaction Log` : 'Transaction Log'}</h2>
        </div>
      </Link>

      <div className="tx-list">
        {entries.length === 0 ? (
          <div className="empty">
            <i className="fa-solid fa-receipt"></i>
            <p>No activity yet.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: '0.88rem',
                color: 'var(--text)',
              }}
            >
              {formatLogEntry(entry)}
            </div>
          ))
        )}
      </div>
    </>
  )
}
