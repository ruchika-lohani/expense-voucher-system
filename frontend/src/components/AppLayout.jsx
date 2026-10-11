import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FilePlus2,
  Files,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/auth'

const navByRole = {
  employee: [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My vouchers', to: '/vouchers', icon: Files },
    { label: 'New voucher', to: '/vouchers/new', icon: FilePlus2 },
  ],
  director: [
    { label: 'Overview', to: '/director/dashboard', icon: LayoutDashboard },
    { label: 'Needs review', to: '/director/pending', icon: ClipboardList },
    { label: 'All vouchers', to: '/director/vouchers', icon: Files },
  ],
  accounts: [
    { label: 'Overview', to: '/accounts/dashboard', icon: LayoutDashboard },
    { label: 'Voucher register', to: '/accounts/vouchers', icon: Files },
  ],
}

const roleNames = { employee: 'Employee', director: 'Director', accounts: 'Accounts' }
const pageNames = {
  '/dashboard': 'Overview',
  '/director/dashboard': 'Overview',
  '/accounts/dashboard': 'Overview',
  '/vouchers': 'My vouchers',
  '/vouchers/new': 'New voucher',
  '/director/pending': 'Needs review',
  '/director/vouchers': 'All vouchers',
  '/accounts/vouchers': 'Voucher register',
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const title = pageNames[location.pathname] || (location.pathname.endsWith('/edit') ? 'Edit voucher' : 'Voucher details')
  const navItems = navByRole[user?.role] || []

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-frame">
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-symbol"><CircleDollarSign size={22} strokeWidth={2.2} /></div>
          <div><strong>Northstar</strong><span>EXPENSE DESK</span></div>
          <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={19} /></button>
        </div>
        <div className="workspace-chip"><span className="workspace-dot" />Finance workspace<ChevronDown size={14} /></div>
        <p className="nav-eyebrow">WORKSPACE</p>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="note-icon"><BadgeCheck size={17} /></div>
            <strong>Good records, clear decisions.</strong>
            <span>Everything you need to move expenses forward.</span>
          </div>
          <button className="profile-row" onClick={signOut} title="Sign out">
            <span className="avatar avatar-sidebar">{initials(user?.full_name)}</span>
            <span className="profile-copy"><strong>{user?.full_name}</strong><span>{roleNames[user?.role]}</span></span>
            <LogOut size={17} className="logout-icon" />
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{title}</strong></div>
          <div className="topbar-right"><span className="today-label">Expense management</span><span className="avatar avatar-top">{initials(user?.full_name)}</span></div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  )
}