import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <div className="auth-loading"><span className="loading-mark" />Loading your workspace</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />
  return <Outlet />
}