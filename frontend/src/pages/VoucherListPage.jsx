import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Pencil, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/auth'
import { EmptyState, LoadingState, PageHeading, StatusBadge, VoucherLink } from '../components/ui'
import { formatDate, money } from '../lib/formatters'

const routeBase = { employee: '/vouchers', director: '/director/vouchers', accounts: '/accounts/vouchers' }
const statuses = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

export default function VoucherListPage({ mode }) {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '', sortBy: 'created_at', order: 'desc' })
  const [loading, setLoading] = useState(true)
  const activeStatus = mode === 'pending' ? 'PENDING_APPROVAL' : filters.status

  useEffect(() => {
    let active = true
    const loadVouchers = async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/vouchers', {
          params: {
            search: filters.search,
            status: activeStatus,
            sortBy: filters.sortBy,
            order: filters.order,
            page,
            limit: 8,
          },
        })
        if (!active) return
        setRows(data.data || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 0)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load vouchers.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadVouchers()
    return () => { active = false }
  }, [filters.search, filters.sortBy, filters.order, activeStatus, page])

  const director = user.role === 'director'
  const title = mode === 'pending' ? 'Needs review' : user.role === 'employee' ? 'My vouchers' : user.role === 'accounts' ? 'Voucher register' : 'All vouchers'
  const description = mode === 'pending'
    ? 'Review submitted expenses and record a decision.'
    : user.role === 'employee'
      ? 'Track drafts, submissions, and completed decisions.'
      : 'Search and review expense voucher records.'
  const detailBase = routeBase[user.role]

  const applySearch = (event) => {
    event.preventDefault()
    setPage(1)
    setFilters((current) => ({ ...current, search: searchInput.trim() }))
  }

  const changeStatus = (event) => {
    setPage(1)
    setFilters((current) => ({ ...current, status: event.target.value }))
  }

  const changeSort = (event) => {
    const [sortBy, order] = event.target.value.split(':')
    setPage(1)
    setFilters((current) => ({ ...current, sortBy, order }))
  }

  const deleteDraft = async (voucher) => {
    if (!window.confirm(`Delete draft ${voucher.voucher_number}? This cannot be undone.`)) return
    try {
      await api.delete(`/vouchers/${voucher.id}`)
      toast.success('Draft voucher deleted.')
      const { data } = await api.get('/vouchers', {
        params: { search: filters.search, status: activeStatus, sortBy: filters.sortBy, order: filters.order, page, limit: 8 },
      })
      setRows(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
      if (data.data.length === 0 && page > 1) setPage((current) => current - 1)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete this draft.')
    }
  }

  return (
    <div className="page-stack">
      <PageHeading eyebrow={director ? 'DIRECTOR WORKSPACE' : `${user.role.toUpperCase()} WORKSPACE`} title={title} description={description} action={user.role === 'employee' ? <Link className="secondary-button" to="/vouchers/new">+ New voucher</Link> : null} />
      <section className="panel voucher-register">
        <div className="register-toolbar">
          <form className="search-form" onSubmit={applySearch}><Search size={17} /><input aria-label="Search voucher number or employee" placeholder="Search voucher number or employee" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /><button type="submit">Search</button></form>
          <div className="filter-controls"><label className="select-control"><SlidersHorizontal size={15} /><select aria-label="Filter by status" value={activeStatus} disabled={mode === 'pending'} onChange={changeStatus}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label className="select-control sort-control"><span>Sort</span><select aria-label="Sort vouchers" value={`${filters.sortBy}:${filters.order}`} onChange={changeSort}><option value="created_at:desc">Newest first</option><option value="created_at:asc">Oldest first</option><option value="amount:desc">Amount high to low</option><option value="amount:asc">Amount low to high</option><option value="expense_date:desc">Expense date</option></select></label></div>
        </div>
        <div className="register-summary"><span>{total} {total === 1 ? 'voucher' : 'vouchers'}</span><span><span className="summary-dot" />Updated just now</span></div>
        {loading ? <LoadingState label="Loading vouchers" /> : rows.length === 0 ? (
          <EmptyState title="No matching vouchers" description="Try another search or adjust the status filter." action={filters.search || activeStatus ? <button className="text-link button-link" onClick={() => { setSearchInput(''); setFilters({ search: '', status: '', sortBy: 'created_at', order: 'desc' }); setPage(1) }}>Clear filters <ArrowRight size={15} /></button> : null} />
        ) : (
          <>
            <div className="table-scroll"><table className="data-table"><thead><tr><th>Voucher</th><th>Employee</th><th>Department</th><th>Expense date</th><th>Amount</th><th>Status</th><th><span className="sr-only">Open voucher</span></th></tr></thead><tbody>
              {rows.map((voucher) => <tr key={voucher.id}><td><VoucherLink voucher={voucher} to={`${detailBase}/${voucher.id}`} /><span className="table-secondary">{voucher.title}</span></td><td>{voucher.employee_name || '—'}</td><td>{voucher.department || '—'}</td><td>{formatDate(voucher.expense_date)}</td><td className="amount-cell">{money(voucher.amount)}</td><td><StatusBadge status={voucher.status} /></td><td><div className="row-actions">{user.role === 'employee' && voucher.status === 'DRAFT' && <><Link className="row-open" to={`/vouchers/${voucher.id}/edit`} aria-label={`Edit draft ${voucher.voucher_number}`} title="Edit draft"><Pencil size={15} /></Link><button className="row-open row-delete" onClick={() => deleteDraft(voucher)} aria-label={`Delete draft ${voucher.voucher_number}`} title="Delete draft"><Trash2 size={15} /></button></>}<Link className="row-open" to={`${detailBase}/${voucher.id}`} aria-label={`Open voucher ${voucher.voucher_number}`} title="View details"><ArrowRight size={16} /></Link></div></td></tr>)}
            </tbody></table></div>
            <div className="pagination"><span>Showing <strong>{(page - 1) * 8 + 1}–{Math.min(page * 8, total)}</strong> of <strong>{total}</strong></span><div><button className="pagination-button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ArrowLeft size={15} /></button><span className="page-count">{page} <span>/</span> {Math.max(totalPages, 1)}</span><button className="pagination-button" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}><ArrowRight size={15} /></button></div></div>
          </>
        )}
      </section>
    </div>
  )
}