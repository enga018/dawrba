import Link from 'next/link'
import RecentTransactions from '@/app/RecentTransactions'

export default function TransactionsPage() {
  return (
    <>
      <Link href="/">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Transactions</h2>
        </div>
      </Link>

      <RecentTransactions showHeader={false} />
    </>
  )
}
