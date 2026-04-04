import { Navigate, Outlet } from 'react-router-dom'
import { getDashboardPathByRole } from '../context/authRoles'
import useAuth from '../context/useAuth'

function ProtectedRoute({ allowedRoles }) {
  const { isInitializing, isAuthenticated, role, user } = useAuth()

  if (isInitializing) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  if (user?.active === false) {
    return <Navigate to="/signin?oauth=failed&message=Your%20account%20is%20inactive" replace />
  }

  if (user?.provider === 'LOCAL' && user?.emailVerified === false) {
    const encodedEmail = encodeURIComponent(user?.email || '')
    return <Navigate to={`/verify-email?email=${encodedEmail}`} replace />
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to={getDashboardPathByRole(role)} replace />
  }

  return <Outlet />
}

export default ProtectedRoute



