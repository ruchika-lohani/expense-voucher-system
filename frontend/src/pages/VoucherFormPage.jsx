import { useEffect, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, CalendarDays, Check, Save, Upload } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { LoadingState, PageHeading } from '../components/ui'

const voucherSchema = z.object({
  voucher_date: z.string().min(1, 'Voucher date is required.'),
  expense_date: z.string().min(1, 'Expense date is required.'),
  department: z.string().trim().min(1, 'Department is required.'),
  title: z.string().trim().min(3, 'Use at least 3 characters.'),
  category: z.string().trim().min(1, 'Category is required.'),
  description: z.string().trim().min(5, 'Add at least 5 characters.'),
  amount: z.coerce.number().positive('Amount must be greater than 0.'),
  employee_id: z.string().optional(),
})

function todayInputValue() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function dateInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function VoucherFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [signature, setSignature] = useState(null)
  const [signaturePreview, setSignaturePreview] = useState('')
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      voucher_date: todayInputValue(),
      expense_date: todayInputValue(),
      department: '',
      title: '',
      category: '',
      description: '',
      amount: '',
      employee_id: '',
    },
  })

  useEffect(() => {
    if (!editing) return undefined
    let active = true
    api.get(`/vouchers/${id}`)
      .then(({ data }) => {
        if (!active) return
        const voucher = data.voucher
        reset({
          voucher_date: dateInputValue(voucher.voucher_date),
          expense_date: dateInputValue(voucher.expense_date),
          department: voucher.department || '',
          title: voucher.title || '',
          category: voucher.category || '',
          description: voucher.description || '',
          amount: Number(voucher.amount),
          employee_id: voucher.employee_id || '',
        })
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load this voucher.'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [editing, id, reset])

  const onSubmit = async (values) => {
    await saveVoucher(values, false)
  }

  const saveVoucher = async (values, submitAfterSave) => {
    if (submitAfterSave && !signature) {
      toast.error('Add your signature image before submitting for approval.')
      return
    }
    if (submitAfterSave && !window.confirm('Submit this voucher for director approval? You will not be able to edit it afterward.')) return

    setSaving(true)
    try {
      const response = editing
        ? await api.put(`/vouchers/${id}`, values)
        : await api.post('/vouchers', values)
      const voucherId = response.data.voucher.id

      if (submitAfterSave) {
        const body = new FormData()
        body.append('employee_signature', signature)
        await api.post(`/vouchers/${voucherId}/submit`, body)
        toast.success('Voucher submitted for approval.')
      } else {
        toast.success(editing ? 'Draft voucher updated.' : 'Voucher saved as draft.')
      }
      navigate(`/vouchers/${voucherId}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save this voucher.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading voucher details" />

  return (
    <div className="page-stack">
      <PageHeading eyebrow="EMPLOYEE WORKSPACE" title={editing ? 'Edit voucher' : 'New voucher'} description={editing ? 'Update the details while this voucher is still a draft.' : 'Record an expense clearly. You can review it before submission.'} action={<Link className="quiet-link" to="/vouchers"><ArrowLeft size={16} />Back to vouchers</Link>} />
      <form className="panel voucher-form-panel" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-section-heading"><span className="form-section-number">01</span><div><h2>Voucher details</h2><p>Enter the dates and identify the expense.</p></div></div>
        <div className="form-grid">
          <FormField label="Voucher date" error={errors.voucher_date?.message}><div className="input-with-icon form-input-icon"><CalendarDays size={16} /><input type="date" {...register('voucher_date')} /></div></FormField>
          <FormField label="Expense date" error={errors.expense_date?.message}><div className="input-with-icon form-input-icon"><CalendarDays size={16} /><input type="date" {...register('expense_date')} /></div></FormField>
          <FormField label="Department" error={errors.department?.message}><input className="text-input" placeholder="e.g. Operations" {...register('department')} /></FormField>
          <FormField label="Category" error={errors.category?.message}><select className="text-input" defaultValue="" {...register('category')}><option value="" disabled>Select a category</option><option>Travel</option><option>Meals</option><option>Supplies</option><option>Software</option><option>Accommodation</option><option>Other</option></select></FormField>
          <FormField label="Voucher title" error={errors.title?.message} wide><input className="text-input" placeholder="A short description of the expense" {...register('title')} /></FormField>
          <FormField label="Description" error={errors.description?.message} wide><textarea className="text-input textarea-input" rows="4" placeholder="Include business purpose and any helpful context." {...register('description')} /></FormField>
        </div>

        <div className="form-section-heading form-section-spaced"><span className="form-section-number">02</span><div><h2>Amount and reference</h2><p>Confirm the amount and supporting employee reference.</p></div></div>
        <div className="form-grid form-grid-bottom">
          <FormField label="Amount (USD)" error={errors.amount?.message}><div className="currency-input"><span>$</span><input className="text-input" type="number" min="0.01" step="0.01" placeholder="0.00" {...register('amount')} /></div></FormField>
          <FormField label="Employee ID" error={errors.employee_id?.message}><input className="text-input" placeholder="Optional" {...register('employee_id')} /></FormField>
        </div>
        <div className="form-section-heading form-section-spaced"><span className="form-section-number">03</span><div><h2>Employee signature</h2><p>Attach a signature image before requesting approval.</p></div></div>
        <div className="signature-form-wrap"><SignaturePicker file={signature} setFile={setSignature} preview={signaturePreview} setPreview={setSignaturePreview} /></div>
        <div className="form-footer"><span>{signature ? 'Signature attached and ready for submission.' : 'A signature is required before submitting for approval.'}</span><div className="form-footer-actions"><button className="secondary-button" type="button" disabled={saving} onClick={handleSubmit((values) => saveVoucher(values, false))}><Save size={16} />{saving ? 'Saving…' : 'Save as Draft'}</button><button className="primary-button" type="button" disabled={saving} onClick={handleSubmit((values) => saveVoucher(values, true))}>{saving ? 'Working…' : 'Submit for approval'}<Check size={16} /></button></div></div>
      </form>
    </div>
  )
}

function FormField({ label, error, wide, children }) {
  return <label className={`form-field ${wide ? 'form-field-wide' : ''}`}><span className="field-label">{label}</span>{children}{error && <span className="field-error">{error}</span>}</label>
}

function SignaturePicker({ file, setFile, preview, setPreview }) {
  const handleChange = (event) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (!['image/jpeg', 'image/png'].includes(selected.type)) {
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
    setPreview(URL.createObjectURL(selected))
  }

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  return (
    <label className={`signature-picker ${preview ? 'signature-picker-ready' : ''}`}>
      <input type="file" accept="image/png,image/jpeg" onChange={handleChange} />
      {preview ? <img src={preview} alt="Preview of uploaded employee signature" /> : <span className="signature-picker-icon"><Upload size={18} /></span>}
      <span className="signature-picker-copy"><strong>{file?.name || 'Upload signature image'}</strong><small>{file ? `${(file.size / 1024).toFixed(0)} KB · preview ready` : 'JPG or PNG · up to 2 MB'}</small></span>
      <span className="upload-browse">{file ? 'Change' : 'Browse'}</span>
    </label>
  )
}