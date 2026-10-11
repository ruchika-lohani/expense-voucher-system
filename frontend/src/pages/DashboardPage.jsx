import { useEffect, useState } from 'react'
import { ArrowRight, BadgeCheck, Banknote, CalendarCheck2, ClipboardCheck, Clock3, FilePlus2, FileText, ReceiptText, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/auth'
import { EmptyState, LoadingState, PageHeading, StatCard, StatusBadge, VoucherLink } from '../components/ui'
import { formatDate, money } from '../lib/formatters'

const voucherPath = { employee: '/vouchers', director: '/director/vouchers', accounts: '/accounts/vouchers' }

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const loadDashboard = async () => {
      setLoading(true)
      try {
        const [{ data: dashboard }, { data: voucherList }] = await Promise.all([
          api.get('/dashboard'),
          api.get('/vouchers', { params: { limit: 5, sortBy: 'created_at', order: 'desc' } }),
        ])
        if (!active) return
        setStats(dashboard)
        if (user.role === 'employee') setRecords(voucherList.data || [])
        else if (user.role === 'director') setRecords(dashboard.recent_activities || [])
        else setRecords(dashboard.recent_approved_vouchers || [])
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load your dashboard.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadDashboard()
    return () => { active = false }
  }, [user.role])

  const employee = user.role === 'employee'
  const director = user.role === 'director'
  const title = employee ? `Good morning, ${user.full_name.split(' ')[0]}` : director ? 'Review with confidence' : 'The voucher register'
  const description = employee
    ? 'Here’s the latest on the expenses you’ve submitted.'
    : director
      ? 'A clear view of approvals, decisions, and what needs attention.'
      : 'Approved spend and voucher activity, all in one place.'
  const cards = employee
    ? [
        { label: 'Total vouchers', value: stats?.total ?? '—', detail: 'Across your submissions', icon: ReceiptText, tone: 'green' },
        { label: 'In review', value: stats?.pending ?? '—', detail: 'Awaiting a decision', icon: Clock3, tone: 'amber' },
        { label: 'Approved', value: stats?.approved ?? '—', detail: 'Ready for processing', icon: BadgeCheck, tone: 'blue' },
        { label: 'Amount claimed', value: money(stats?.total_amount_claimed), detail: 'All submitted vouchers', icon: WalletCards, tone: 'ink' },
      ]
    : director
      ? [
          { label: 'Needs review', value: stats?.pending_count ?? '—', detail: 'Pending your decision', icon: Clock3, tone: 'amber' },
          { label: 'Approved today', value: stats?.approved_today ?? '—', detail: 'Decisions completed', icon: BadgeCheck, tone: 'green' },
          { label: 'Rejected today', value: stats?.rejected_today ?? '—', detail: 'Returned with a reason', icon: ClipboardCheck, tone: 'rose' },
          { label: 'Pending amount', value: money(stats?.total_pending_amount), detail: 'Across the review queue', icon: Banknote, tone: 'ink' },
        ]
      : [
          { label: 'All vouchers', value: stats?.total ?? '—', detail: 'Company-wide records', icon: ReceiptText, tone: 'green' },
          { label: 'Pending', value: stats?.pending ?? '—', detail: 'Awaiting director review', icon: Clock3, tone: 'amber' },
          { label: 'Approved', value: stats?.approved ?? '—', detail: 'Cleared for processing', icon: BadgeCheck, tone: 'blue' },
          { label: 'Approved amount', value: money(stats?.total_approved_amount), detail: 'Total approved spend', icon: Banknote, tone: 'ink' },
        ]

  const recordsTitle = employee ? 'Your recent vouchers' : director ? 'Recent activity' : 'Recently approved'
  const action = employee
    ? <Link className="primary-button" to="/vouchers/new"><FilePlus2 size={17} />New voucher</Link>
    : director
      ? <Link className="primary-button" to="/director/pending"><ClipboardCheck size={17} />Review queue</Link>
      : <Link className="secondary-button" to="/accounts/vouchers"><FileText size={17} />Open register</Link>

  return (
    <div className="page-stack">
      <PageHeading eyebrow={`${user.department || 'Finance'} · ${user.role}`} title={title} description={description} action={action} />

      {director && <section className="review-banner"><div className="review-banner-icon"><CalendarCheck2 size={21} /></div><div><strong>Decisions stay transparent</strong><span>Every approval and rejection is attached to its voucher record.</span></div><Link to="/director/pending" aria-label="Open pending vouchers"><ArrowRight size={18} /></Link></section>}

      {loading ? <LoadingState label="Loading your overview" /> : (
        <>
          <div className="stats-grid">
            {cards.map((card) => <StatCard key={card.label} {...card} />)}
          </div>

          <section className="panel recent-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">THE LATEST</span><h2>{recordsTitle}</h2></div>
              <Link className="text-link" to={voucherPath[user.role]}>View all <ArrowRight size={15} /></Link>
            </div>
            {records.length === 0 ? (
              <EmptyState title="No voucher activity yet" description="New vouchers and decisions will appear here." action={employee ? <Link className="text-link" to="/vouchers/new">Create your first voucher <ArrowRight size={15} /></Link> : null} />
            ) : (
              <div className="activity-list">
                {records.slice(0, 5).map((record) => {
                  const detailPath = `${voucherPath[user.role]}/${record.id}`
                  return (
                    <div className="activity-row" key={record.id}>
                      <div className="activity-mark"><FileText size={17} /></div>
                      <div className="activity-main"><VoucherLink voucher={record} to={detailPath} /><span>{record.employee_name || user.full_name} · {record.category || record.department || 'Expense'}</span></div>
                      <div className="activity-amount"><strong>{money(record.amount)}</strong><span>{formatDate(record.updated_at || record.approval_date || record.expense_date)}</span></div>
                      <StatusBadge status={record.status || 'APPROVED'} />
                    </div>
                  )
                })}
              </div>
            )}
          </section>
          {employee && <div className="quiet-note"><span className="note-dot" />Your vouchers are private to your account until they’re submitted for review.</div>}
        </>
      )}
    </div>
  )
}