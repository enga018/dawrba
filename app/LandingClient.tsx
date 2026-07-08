'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './landing.module.css'

interface Row {
  id: string
  name: string
  meta: string
  amount: number
  paid: boolean
}

const INITIAL_PREVIEW: Row[] = [
  { id: 'asha', name: 'Asha K.', meta: '2 days ago', amount: 12000, paid: false },
  { id: 'rafi', name: 'Rafi M.', meta: '1 week ago', amount: 8400, paid: false },
  { id: 'sara', name: 'Sara N.', meta: '3 days ago', amount: 27100, paid: false },
]

const INITIAL_DEMO: Row[] = [
  { id: 'shahid', name: 'Shahid', meta: 'Since 3 months', amount: 4200, paid: false },
  { id: 'mehreen', name: 'Mehreen', meta: "Sister's neighbor", amount: 3100, paid: false },
  { id: 'ravi', name: 'Ravi', meta: 'Regular — pays monthly', amount: 11450, paid: false },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

export default function LandingClient() {
  const [modalOpen, setModalOpen] = useState(false)
  const [creditModalOpen, setCreditModalOpen] = useState(false)
  const [previewRows, setPreviewRows] = useState(INITIAL_PREVIEW)
  const [demoRows, setDemoRows] = useState(INITIAL_DEMO)
  const [toastMsg, setToastMsg] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [creditName, setCreditName] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const previewTotal = previewRows.filter((r) => !r.paid).reduce((s, r) => s + r.amount, 0)
  const demoTotal = demoRows.filter((r) => !r.paid).reduce((s, r) => s + r.amount, 0)

  const showToast = (message: string) => {
    setToastMsg(message)
    setToastVisible(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 1800)
  }

  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [modalOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (creditModalOpen) setCreditModalOpen(false)
      else if (modalOpen) setModalOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, creditModalOpen])

  const markPreviewPaid = (id: string) => {
    setPreviewRows((rows) => rows.map((r) => (r.id === id ? { ...r, paid: true } : r)))
  }

  const markDemoPaid = (id: string) => {
    setDemoRows((rows) => rows.map((r) => (r.id === id ? { ...r, paid: true } : r)))
    showToast('Marked as paid')
  }

  const openCreditModal = () => {
    setCreditName('')
    setCreditAmount('')
    setCreditModalOpen(true)
  }

  const handleAddCredit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = creditName.trim()
    const amount = parseInt(creditAmount, 10)
    if (!name || !amount || amount <= 0) return

    setDemoRows((rows) => [
      ...rows,
      { id: `${Date.now()}`, name, meta: 'Just now', amount, paid: false },
    ])
    setCreditModalOpen(false)
    showToast(`${name} added with ${formatCurrency(amount)}`)
  }

  return (
    <div className={styles.pageWrap}>
      <div className={styles.appShell}>
        <section className={styles.hero}>
          <div className={styles.heroTop}>
            <div className={styles.logo}>
              DawrBa<span className={styles.dot}></span>
            </div>
            <div className={styles.pill}>
              <i className="fa-solid fa-bolt"></i> Fast & simple
            </div>
          </div>
          <h1>Track credit. Get paid faster. Never lose a rupee.</h1>
          <p>Built for small shop owners who want calm, clear records and friendly payment reminders.</p>
          <div className={styles.heroActions}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setModalOpen(true)}>
              <i className="fa-solid fa-play"></i> Try Demo
            </button>
            <Link href="/login" className={`${styles.btn} ${styles.btnSecondary}`}>
              <i className="fa-solid fa-user"></i> Login / Register
            </Link>
          </div>
        </section>

        <div className={styles.trustBar}>
          <div className={styles.stat}>
            <strong>2.4k+</strong>
            <span>Shops</span>
          </div>
          <div className={styles.stat}>
            <strong>18k+</strong>
            <span>Tracked</span>
          </div>
          <div className={styles.stat}>
            <strong>97%</strong>
            <span>Reminders</span>
          </div>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <h2>How it works</h2>
            <span>Simple steps</span>
          </div>
          <div className={styles.stepsGrid}>
            <div className={`${styles.card} ${styles.stepCard}`}>
              <div className={styles.stepNo}>1</div>
              <div>
                <h3>Add Customer</h3>
                <p>Save the shop name, phone, and outstanding balance in seconds.</p>
              </div>
            </div>
            <div className={`${styles.card} ${styles.stepCard}`}>
              <div className={styles.stepNo}>2</div>
              <div>
                <h3>Log Credit</h3>
                <p>Record every transaction with a clear date and note for future reference.</p>
              </div>
            </div>
            <div className={`${styles.card} ${styles.stepCard}`}>
              <div className={styles.stepNo}>3</div>
              <div>
                <h3>Send Reminder</h3>
                <p>Tap once to send a friendly WhatsApp reminder without switching apps.</p>
              </div>
            </div>
            <div className={`${styles.card} ${styles.stepCard}`}>
              <div className={styles.stepNo}>4</div>
              <div>
                <h3>Get Paid</h3>
                <p>Watch balances move to paid, so cash flow stays clear and predictable.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <h2>Live preview</h2>
            <span>Interactive demo</span>
          </div>
          <div className={`${styles.card} ${styles.previewCard}`}>
            <div className={styles.previewHeader}>
              <strong>DawrBa — My Shop</strong>
              <div className={styles.previewHeaderIcons}>
                <span className={styles.previewHeaderIcon}>
                  <i className="fa-solid fa-plus"></i>
                </span>
                <span className={styles.previewHeaderIcon}>
                  <i className="fa-solid fa-right-from-bracket"></i>
                </span>
              </div>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewToolbar}>
                <div className={styles.previewSearch}>
                  <i className="fa-solid fa-search"></i>
                  <input type="text" placeholder="Search customers..." readOnly />
                </div>
                <select className={styles.previewSort}>
                  <option>Name (A-Z)</option>
                </select>
              </div>
              <div className={styles.customerList}>
                {previewRows.map((row) => (
                  <div
                    key={row.id}
                    className={`${styles.customerItem} ${row.paid ? styles.paid : ''}`}
                  >
                    <div className={styles.customerLeft}>
                      <div className={`${styles.avatar} ${styles.avatarSm}`}>{initials(row.name)}</div>
                      <div className={styles.customerMeta}>
                        <strong>{row.name}</strong>
                        <span>{row.meta}</span>
                      </div>
                    </div>
                    <div className={styles.customerAmount}>
                      {formatCurrency(row.amount)}
                      <button
                        className={styles.previewPaidBtn}
                        title="Mark paid"
                        onClick={() => markPreviewPaid(row.id)}
                      >
                        <i className="fa-solid fa-check-circle"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.previewFooter}>
                <span className={styles.previewFooterLabel}>Total pending</span>
                <span className={styles.previewFooterAmount}>{formatCurrency(previewTotal)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <h2>Features</h2>
            <span>Made for daily use</span>
          </div>
          <div className={styles.featuresGrid}>
            <div className={`${styles.card} ${styles.featureCard}`}>
              <i className="fa-solid fa-bolt"></i>
              <h3>Lightning Fast</h3>
              <p>Log credit in under 10 seconds from the shop counter.</p>
            </div>
            <div className={`${styles.card} ${styles.featureCard}`}>
              <i className="fa-brands fa-whatsapp"></i>
              <h3>WhatsApp Reminders</h3>
              <p>Send polished reminders that feel personal and clear.</p>
            </div>
            <div className={`${styles.card} ${styles.featureCard}`}>
              <i className="fa-solid fa-wifi-slash"></i>
              <h3>Works Offline</h3>
              <p>Keep your records safe even when the signal drops.</p>
            </div>
            <div className={`${styles.card} ${styles.featureCard}`}>
              <i className="fa-solid fa-phone"></i>
              <h3>Phone First</h3>
              <p>Built for quick taps, with a simple layout for busy days.</p>
            </div>
          </div>
        </section>

        <div className={styles.ctaBox}>
          <h3>Try it now</h3>
          <p>No signup required</p>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setModalOpen(true)}>
            <i className="fa-solid fa-arrow-right"></i> Try It Now
          </button>
        </div>

        <div className={styles.footer}>© 2026 DawrBa · Built for local businesses</div>
      </div>

      <div
        className={`${styles.modalBackdrop} ${modalOpen ? styles.active : ''}`}
        aria-hidden={!modalOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false)
        }}
      >
        <div className={styles.modalSheet} role="dialog" aria-modal="true" aria-label="DawrBa demo">
          <div className={styles.modalHead}>
            <h3>Quick demo</h3>
            <button
              className={styles.modalClose}
              aria-label="Close demo"
              onClick={() => setModalOpen(false)}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className={styles.modalSummary}>
            <div className={styles.modalSummaryLabel}>Pending this week</div>
            <div className={styles.modalSummaryAmount}>{formatCurrency(demoTotal)}</div>
          </div>

          <div className={styles.card} style={{ padding: '12px 14px' }}>
            <div className={styles.modalActions}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreditModal}>
                <i className="fa-solid fa-plus"></i> Add Credit
              </button>
              <button
                className={`${styles.btn} ${styles.btnSecondaryLight}`}
                onClick={() => showToast('Remind is coming soon')}
              >
                <i className="fa-solid fa-paper-plane"></i> Remind
              </button>
            </div>

            <div className={styles.customerList} style={{ marginTop: '10px' }}>
              {demoRows.map((row) => (
                <div key={row.id} className={`${styles.modalRow} ${row.paid ? styles.paid : ''}`}>
                  <div>
                    <strong>{row.name}</strong>
                    <br />
                    <span>{row.meta}</span>
                  </div>
                  <div className={styles.amt}>
                    {formatCurrency(row.amount)}
                    <button
                      className={styles.markPaidBtn}
                      title="Mark paid"
                      onClick={() => markDemoPaid(row.id)}
                    >
                      <i className="fa-solid fa-check-circle"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ flex: 1 }}
              onClick={() => showToast('Get Full Access is coming soon')}
            >
              <i className="fa-solid fa-unlock"></i> Get Full Access
            </button>
          </div>
        </div>
      </div>

      <div
        className={`${styles.modalBackdrop} ${creditModalOpen ? styles.active : ''}`}
        aria-hidden={!creditModalOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) setCreditModalOpen(false)
        }}
      >
        <div
          className={`${styles.modalSheet} ${styles.modalSheetNarrow}`}
          role="dialog"
          aria-modal="true"
          aria-label="Add demo credit"
        >
          <div className={styles.modalHead}>
            <h3>Add demo credit</h3>
            <button
              className={styles.modalClose}
              aria-label="Close"
              onClick={() => setCreditModalOpen(false)}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form onSubmit={handleAddCredit}>
            <div className={styles.field}>
              <label htmlFor="demoName">Customer name</label>
              <input
                type="text"
                id="demoName"
                placeholder="e.g. Priya"
                required
                value={creditName}
                onChange={(e) => setCreditName(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="demoAmount">Amount (₹)</label>
              <input
                type="number"
                id="demoAmount"
                placeholder="0"
                required
                min={1}
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: '100%' }}>
              Add to demo
            </button>
          </form>
        </div>
      </div>

      <div className={`${styles.toast} ${toastVisible ? styles.show : ''}`}>{toastMsg}</div>
    </div>
  )
}
