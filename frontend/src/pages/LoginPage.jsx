import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, CircleDollarSign, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/auth'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid work email address.'),
  password: z.string().min(1, 'Password is required.'),
})

const roleHome = { employee: '/dashboard', director: '/director/dashboard', accounts: '/accounts/dashboard' }
const currentYear = new Date().getFullYear()

export default function LoginPage() {
  const { login, user, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (user) navigate(roleHome[user.role] || '/login', { replace: true })
  }, [user, navigate])

  if (!ready) return <div className="auth-loading"><span className="loading-mark" />Loading your workspace</div>
  if (user) return <Navigate to={roleHome[user.role] || '/login'} replace />

  const onSubmit = async (values) => {
    setSubmitting(true)
    try {
      const loggedInUser = await login(values)
      toast.success(`Welcome back, ${loggedInUser.full_name.split(' ')[0]}.`)
      const intendedPath = location.state?.from?.pathname
      navigate(intendedPath && intendedPath !== '/login' ? intendedPath : roleHome[loggedInUser.role], { replace: true })
    } catch (error) {
      const message = error.response?.data?.message || 'We could not sign you in. Check your details and try again.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="login-brand">
          <span className="login-brand-mark"><CircleDollarSign size={22} /></span>
          <span><strong>Northstar</strong><small>EXPENSE DESK</small></span>
        </div>
        <div className="login-brand-copy">
          <span className="login-kicker"><span />WORK, ACCOUNTED FOR</span>
          <h1>Clear expenses.<br /><em>Better decisions.</em></h1>
          <p>A calmer way to prepare, review, and keep track of company spending.</p>
        </div>
        <div className="login-artwork" aria-hidden="true">
          <div className="art-sheet art-sheet-back"><span /><span /><span /></div>
          <div className="art-sheet art-sheet-front"><div className="art-check"><ShieldCheck size={24} /></div><b>EXPENSE REPORT</b><span className="art-line art-line-wide" /><span className="art-line" /><span className="art-line art-line-short" /><div className="art-total"><small>REIMBURSEMENT</small><strong>$1,284.50</strong><span>READY FOR REVIEW</span></div></div>
          <div className="art-stamp"><span>APPROVED</span><ShieldCheck size={15} /></div>
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
        </div>
        <div className="login-brand-footer"><span>Secure sign-in</span><span>•</span><span>Role-based access</span><span>•</span><span>Audit-ready records</span></div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="form-welcome"><span className="eyebrow">YOUR WORKSPACE</span><h2>Welcome back</h2><p>Sign in with your company account to continue.</p></div>
          <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <label className="field-label" htmlFor="email">Work email</label>
            <div className={`input-with-icon ${errors.email ? 'input-invalid' : ''}`}><Mail size={17} /><input id="email" type="email" autoComplete="username" placeholder="you@company.com" {...register('email')} /></div>
            {errors.email && <span className="field-error">{errors.email.message}</span>}

            <div className="field-label-row"><label className="field-label" htmlFor="password">Password</label><span className="form-small-note">Company credentials</span></div>
            <div className={`input-with-icon ${errors.password ? 'input-invalid' : ''}`}><LockKeyhole size={17} /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" {...register('password')} /><button type="button" className="reveal-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            {errors.password && <span className="field-error">{errors.password.message}</span>}

            <button className="primary-button login-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}<ArrowRight size={17} /></button>
          </form>
          <div className="login-help"><span className="help-shield"><ShieldCheck size={16} /></span><span>Your account is protected with encrypted authentication.</span></div>
          <div className="login-copyright">© {currentYear} Northstar Finance <span>•</span> Internal use only</div>
        </div>
      </section>
    </main>
  )
}