import { useEffect, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, CalendarDays, Save } from 'lucide-react'
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
    setSaving(true)
    try {
      const response = editing
        ? await api.put(`/vouchers/${id}`, values)
        : await api.post('/vouchers', values)
      toast.success(editing ? 'Voucher updated.' : 'Draft voucher created.')
      navigate(`/vouchers/${response.data.voucher.id}`)
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
        <div className="form-footer"><span>Saved as a draft until you submit it for approval.</span><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create draft'}<Save size={16} /></button></div>
      </form>
    </div>
  )
}

function FormField({ label, error, wide, children }) {
  return <label className={`form-field ${wide ? 'form-field-wide' : ''}`}><span className="field-label">{label}</span>{children}{error && <span className="field-error">{error}</span>}</label>
}