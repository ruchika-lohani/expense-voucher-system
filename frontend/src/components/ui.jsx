import { ArrowDownRight, ArrowUpRight, CircleDashed, FileSearch2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, detail, icon: Icon, tone = 'green', trend }) {
  return (
    <section className={`stat-card stat-${tone}`}>
      <div className="stat-topline"><span>{label}</span><span className="stat-icon"><Icon size={18} /></span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">{trend && <span className={`stat-trend ${trend.direction === 'down' ? 'trend-down' : ''}`}>{trend.direction === 'down' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{trend.label}</span>}<span>{detail}</span></div>
    </section>
  )
}

export function StatusBadge({ status }) {
  const labels = { DRAFT: 'Draft', PENDING_APPROVAL: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }
  return <span className={`status-badge status-${String(status || '').toLowerCase()}`}><span />{labels[status] || status || 'Unknown'}</span>
}

export function EmptyState({ title = 'Nothing to show yet', description = 'Try changing your filters or check back later.', action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><FileSearch2 size={23} /></div>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function LoadingState({ label = 'Loading your records' }) {
  return <div className="loading-state"><CircleDashed size={20} className="spin" /><span>{label}</span></div>
}

export function VoucherLink({ voucher, to }) {
  return <Link className="voucher-number" to={to}>{voucher.voucher_number || `Voucher #${voucher.id}`}</Link>
}

