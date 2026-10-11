import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/auth'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import DashboardPage from './pages/DashboardPage'
import VoucherListPage from './pages/VoucherListPage'
import VoucherFormPage from './pages/VoucherFormPage'
import VoucherDetailPage from './pages/VoucherDetailPage'
import './App.css'

const roleHome = {
  employee: '/dashboard',
  director: '/director/dashboard',
  accounts: '/accounts/dashboard',
}

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={roleHome[user?.role] || '/login'} replace />
}

function RoutedApp() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomeRedirect />} />
            <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/vouchers" element={<VoucherListPage />} />
              <Route path="/vouchers/new" element={<VoucherFormPage />} />
              <Route path="/vouchers/:id" element={<VoucherDetailPage />} />
              <Route path="/vouchers/:id/edit" element={<VoucherFormPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['director']} />}>
              <Route path="/director/dashboard" element={<DashboardPage />} />
              <Route path="/director/pending" element={<VoucherListPage mode="pending" />} />
              <Route path="/director/vouchers" element={<VoucherListPage />} />
              <Route path="/director/vouchers/:id" element={<VoucherDetailPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['accounts']} />}>
              <Route path="/accounts/dashboard" element={<DashboardPage />} />
              <Route path="/accounts/vouchers" element={<VoucherListPage />} />
              <Route path="/accounts/vouchers/:id" element={<VoucherDetailPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
      <Toaster position="top-right" toastOptions={{ duration: 3600, style: { borderRadius: '10px', background: '#173a34', color: '#fff' } }} />
    </>
  )
}

export default function App() {
  return <AuthProvider><RoutedApp /></AuthProvider>
}
