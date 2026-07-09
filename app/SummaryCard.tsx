'use client'

interface SummaryCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  trend?: {
    value: number
    label: string
  }
}

export default function SummaryCard({ title, value, icon, color, trend }: SummaryCardProps) {
  return (
    <div className="summary-card">
      <style>{`
        .summary-card {
          background: white;
          border-radius: 18px;
          padding: 20px;
          border: 1px solid var(--border);
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
          transition: all 0.2s ease;
        }
        .summary-card:hover {
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
        }
        .summary-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .summary-card-title {
          font-size: 0.9rem;
          color: var(--meta);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .summary-card-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: ${color};
          color: white;
          font-size: 1.1rem;
        }
        .summary-card-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }
        .summary-card-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
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
      `}</style>
      
      <div className="summary-card-header">
        <div className="summary-card-title">{title}</div>
        <div className="summary-card-icon">{icon}</div>
      </div>
      
      <div className="summary-card-value">
        {typeof value === 'number' ? '₹' + value.toLocaleString('en-IN') : value}
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