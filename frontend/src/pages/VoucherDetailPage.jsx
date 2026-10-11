import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Download, FileText, Pencil, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/auth'
import { EmptyState, LoadingState, PageHeading, StatusBadge } from '../components/ui'
import { formatDate, money } from '../lib/formatters'

const routeBase = { employee: '/vouchers', director: '/director/vouchers', accounts: '/accounts/vouchers' }

const apiOrigin = import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL, window.location.origin).origin : ''
const fileUrl = (path) => (!path ? '' : /^https?:/.test(path) ? path : `${apiOrigin}${path.startsWith('/') ? '' : '/'}${path}`)

export default function VoucherDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [voucher, setVoucher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [signature, setSignature] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const base = routeBase[user.role]
  const isDirector = user.role === 'director'
  const isEmployee = user.role === 'employee'

  const loadVoucher = async () => {
    const { data } = await api.get(`/vouchers/${id}`)
    setVoucher(data.voucher)
  }

  useEffect(() => {
    let active = true
    api.get(`/vouchers/${id}`)
      .then(({ data }) => { if (active) setVoucher(data.voucher) })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load this voucher.'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const submitForApproval = async () => {
    if (!signature) return toast.error('Choose a JPG or PNG signature image first.')
    if (!window.confirm('Submit this voucher for director approval? You will not be able to edit it afterward.')) return
    const body = new FormData()
    body.append('employee_signature', signature)
    await runAction(() => api.post(`/vouchers/${id}/submit`, body), 'Voucher submitted for approval.')
  }

  const approve = async () => {
    if (!signature && !user.signature_path) return toast.error('Choose a director signature image to approve this voucher.')
    const body = new FormData()
    if (signature) body.append('director_signature', signature)
    await runAction(() => api.post(`/vouchers/${id}/approve`, body), 'Voucher approved.')
  }

  const reject = async () => {
    if (rejectionReason.trim().length < 5) return toast.error('Add a rejection reason of at least 5 characters.')
    await runAction(() => api.post(`/vouchers/${id}/reject`, { rejection_reason: rejectionReason }), 'Voucher rejected.')
  }

  const runAction = async (action, successMessage) => {
    setBusy(true)
    try {
      await action()
      toast.success(successMessage)
      setSignature(null)
      setRejectionReason('')
      await loadVoucher()
    } catch (error) {
      toast.error(error.response?.data?.message || 'That action could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  const deleteDraft = async () => {
    if (!window.confirm('Delete this draft voucher? This cannot be undone.')) return
    setBusy(true)
    try {
      await api.delete(`/vouchers/${id}`)
      toast.success('Draft voucher deleted.')
      navigate(base, { replace: true })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete this draft.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading voucher details" />
  if (!voucher) return <EmptyState title="Voucher not available" description="It may have been removed or you may not have access to it." action={<Link className="text-link" to={base}>Back to vouchers <ArrowLeft size={15} /></Link>} />

  const canSubmit = isEmployee && voucher.status === 'DRAFT'
  const canReview = isDirector && voucher.status === 'PENDING_APPROVAL'
  const canEdit = isEmployee && voucher.status === 'DRAFT'

  return (
    <div className="page-stack">
        <PageHeading eyebrow={`${voucher.voucher_number} · ${voucher.department}`} title={voucher.title} description="Voucher record and approval history." action={<><button type="button" className="secondary-button no-print" onClick={() => window.print()}>Print voucher</button> <Link className="quiet-link no-print" to={base}><ArrowLeft size={16} />Back to vouchers</Link></>} />
      <div className="detail-layout">
        <div className="detail-main-column">
          <section className="panel voucher-overview-card">
            <div className="voucher-overview-head"><div className="voucher-id-lockup"><span className="voucher-file-icon"><FileText size={19} /></span><div><span className="eyebrow">VOUCHER NUMBER</span><strong>{voucher.voucher_number}</strong></div></div><StatusBadge status={voucher.status} /></div>
            <div className="amount-highlight"><span>Claim amount</span><strong>{money(voucher.amount)}</strong><small>USD</small></div>
            <div className="detail-grid">
              <DetailItem label="Employee" value={voucher.employee_name} />
              <DetailItem label="Employee ID" value={voucher.employee_id || '—'} />
              <DetailItem label="Department" value={voucher.department} />
              <DetailItem label="Category" value={voucher.category} />
              <DetailItem label="Voucher date" value={formatDate(voucher.voucher_date)} />
              <DetailItem label="Expense date" value={formatDate(voucher.expense_date)} />
              <DetailItem label="Approval date" value={formatDate(voucher.approval_date)} />
              <DetailItem label="Created" value={formatDate(voucher.created_at)} />
            </div>
            <div className="description-block"><span className="field-label">Business purpose</span><p>{voucher.description}</p></div>
            {voucher.rejection_reason && <div className="rejection-callout"><strong>Reason for rejection</strong><p>{voucher.rejection_reason}</p></div>}
            <div className="signature-grid">
  <SignatureBox label="Employee signature" src={voucher.employee_signature} />
  <SignatureBox label="Director signature" src={voucher.director_signature} />
</div>
          </section>
          {canSubmit && <ActionPanel title="Ready for review?" description="Attach your signature to send this voucher to the director." busy={busy} file={signature} setFile={setSignature} acceptLabel="Add employee signature" buttonLabel="Submit for approval" onAction={submitForApproval} icon={Upload} />}
          {canReview && <DirectorActions busy={busy} file={signature} setFile={setSignature} hasSavedSignature={Boolean(user.signature_path)} reason={rejectionReason} setReason={setRejectionReason} onApprove={approve} onReject={reject} />}
        </div>
        <aside className="detail-side-column">
          <section className="panel status-panel"><span className="eyebrow">CURRENT STATUS</span><StatusBadge status={voucher.status} /><p>{voucher.status === 'DRAFT' ? 'This voucher is saved and can still be edited.' : voucher.status === 'PENDING_APPROVAL' ? 'The voucher is waiting for a director decision.' : voucher.status === 'APPROVED' ? 'The voucher was approved and is ready for processing.' : 'The voucher was rejected. Review the reason before making changes.'}</p></section>
          {canEdit && <section className="panel action-shortcuts"><span className="eyebrow">DRAFT ACTIONS</span><Link className="secondary-button full-button" to={`/vouchers/${voucher.id}/edit`}><Pencil size={16} />Edit voucher</Link><button className="danger-button full-button" onClick={deleteDraft} disabled={busy}><Trash2 size={16} />Delete draft</button></section>}
          <section className="panel timeline-panel"><span className="eyebrow">RECORD TIMELINE</span><div className="timeline-item"><span className="timeline-mark timeline-created"><FileText size={13} /></span><div><strong>Draft created</strong><span>{formatDate(voucher.created_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div></div>{voucher.status !== 'DRAFT' && <div className="timeline-item"><span className="timeline-mark timeline-submitted"><Check size={13} /></span><div><strong>Submitted for approval</strong><span>{formatDate(voucher.updated_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div></div>}{voucher.approval_date && <div className="timeline-item"><span className="timeline-mark timeline-approved"><Check size={13} /></span><div><strong>Decision recorded</strong><span>{formatDate(voucher.approval_date, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div></div>}</section>
        </aside>
      </div>
    </div>
  )
}

function DetailItem
function SignatureBox({ label, src }) {
  return (
    <div className="signature-box">
      <span className="signature-label">{label}</span>
      {src ? <img src={fileUrl(src)} alt={label} /> : <p className="signature-missing">Not signed yet</p>}
    </div>
  )
}


{
  return <div className="detail-item"><span>{label}</span><strong>{value || '—'}</strong></div>
}

function ActionPanel({ title, description, busy, file, setFile, acceptLabel, buttonLabel, onAction, icon: Icon }) {
  return (
    <section className="panel workflow-panel"><div className="workflow-title"><span className="workflow-icon"><Icon size={18} /></span><div><h2>{title}</h2><p>{description}</p></div></div><SignatureInput file={file} setFile={setFile} label={acceptLabel} /><button className="primary-button" disabled={busy || !file} onClick={onAction}>{busy ? 'Working…' : buttonLabel}<Check size={16} /></button></section>
  )
}

function DirectorActions({ busy, file, setFile, hasSavedSignature, reason, setReason, onApprove, onReject }) {
  return (
    <section className="panel workflow-panel director-workflow"><div className="workflow-title"><span className="workflow-icon workflow-icon-director"><ShieldCheck size={18} /></span><div><h2>Director decision</h2><p>Approve with a signature or return this voucher with a reason.</p></div></div>{!hasSavedSignature && <SignatureInput file={file} setFile={setFile} label="Director signature image" />}{hasSavedSignature && <div className="saved-signature-note"><ShieldCheck size={16} />Your saved director signature will be attached.</div>}<div className="decision-divider"><span>OR REJECT WITH REASON</span></div><label className="form-field"><span className="field-label">Rejection reason</span><textarea className="text-input textarea-input" rows="3" minLength="5" placeholder="Explain what needs to change…" value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="decision-actions"><button className="danger-button" disabled={busy} onClick={onReject}><X size={16} />Reject voucher</button><button className="primary-button" disabled={busy || (!file && !hasSavedSignature)} onClick={onApprove}>{busy ? 'Working…' : 'Approve voucher'}<Check size={16} /></button></div></section>
  )
}

function SignatureInput({ file, setFile, label }) {
  const preview = useMemo(() => file ? URL.createObjectURL(file) : '', [file])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const handleChange = (event) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (!['image/png', 'image/jpeg'].includes(selected.type)) {
      toast.error('Signature must be a JPG or PNG image.')
      event.target.value = ''
      return
    }
    if (selected.size > 2 * 1024 * 1024) {
      toast.error('Signature image must be 2 MB or smaller.')
      event.target.value = ''
      return
    }
    setFile(selected)
  }

  return <label className="signature-upload"><input type="file" accept="image/png,image/jpeg" onChange={handleChange} />{preview ? <img className="signature-preview" src={preview} alt="Preview of uploaded signature" /> : <span className="signature-upload-icon"><Upload size={17} /></span>}<span><strong>{file?.name || label}</strong><small>{file ? `${(file.size / 1024).toFixed(0)} KB · preview ready` : 'JPG or PNG · up to 2 MB'}</small></span><span className="upload-browse">{file ? 'Change' : 'Browse'}</span></label>
}