import Link from 'next/link'
import CustomerList from '@/app/CustomerList'

export default function CustomersPage() {
  return (
    <>
      <Link href="/">
        <div className="back-row">
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>Customers</h2>
        </div>
      </Link>

      <CustomerList />
    </>
  )
}
