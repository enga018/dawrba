'use client'

interface SummaryCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  bg: string
  format?: 'currency' | 'count'
  trend?: {
    value: number
    label: string
  }
}

export default function SummaryCard({ title, value, icon, color, bg, format = 'currency', trend }: SummaryCardProps) {
  return (
    <div className="summary-card">
      <style>{`
        .summary-card {
          background: ${bg};
          border-radius: 14px;
          padding: 12px;
          border: 1px solid var(--border);
          transition: box-shadow 0.2s ease;
        }
        .summary-card:hover {
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
        }
        .summary-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .summary-card-title {
          font-size: 0.68rem;
          color: var(--meta);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .summary-card-icon {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: ${color};
          color: white;
          font-size: 0.8rem;
          flex-shrink: 0;
        }
        .summary-card-value {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 2px;
        }
        .summary-card-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .trend-up {
          color: var(--green);
        }
        .trend-down {
          color: var(--red);
        }
        .trend-neutral {
          color: var(--meta);
        }
        @media (min-width: 900px) {
          .summary-card {
            padding: 16px;
            border-radius: 16px;
          }
          .summary-card-title {
            font-size: 0.78rem;
          }
          .summary-card-icon {
            width: 32px;
            height: 32px;
            font-size: 0.95rem;
          }
          .summary-card-value {
            font-size: 1.45rem;
          }
          .summary-card-trend {
            font-size: 0.76rem;
          }
        }
      `}</style>

      <div className="summary-card-header">
        <div className="summary-card-title">{title}</div>
        <div className="summary-card-icon">{icon}</div>
      </div>

      <div className="summary-card-value">
        {typeof value === 'number'
          ? format === 'currency'
            ? '₹' + value.toLocaleString('en-IN')
            : value.toLocaleString('en-IN')
          : value}
      </div>

      {trend && (
        <div className={`summary-card-trend ${trend.value > 0 ? 'trend-up' : trend.value < 0 ? 'trend-down' : 'trend-neutral'}`}>
          <i className={`fa-solid ${trend.value > 0 ? 'fa-arrow-up' : trend.value < 0 ? 'fa-arrow-down' : 'fa-minus'}`}></i>
          <span>{Math.abs(trend.value)}% {trend.label}</span>
        </div>
      )}
    </div>
  )
}