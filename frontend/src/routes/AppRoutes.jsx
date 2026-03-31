import { Navigate, Route, Routes } from 'react-router-dom'
import { getDashboardPathByRole } from '../context/authRoles'
import ForgotPassword from '../pages/auth/ForgotPassword'
import OAuthCallback from '../pages/auth/OAuthCallback'
import useAuth from '../context/useAuth'
import SignIn from '../pages/auth/SignIn'
import SignUp from '../pages/auth/SignUp'
import VerifyEmail from '../pages/auth/VerifyEmail'
import AdminUsersPage from '../pages/dashboard/admin/AdminUsersPage'
import CreateTechnicianPage from '../pages/dashboard/admin/CreateTechnicianPage'
import TechnicianDashboardPage from '../pages/dashboard/technician/TechnicianDashboardPage'
import UserDashboard from '../pages/dashboard/UserDashboard'
import UserProfile from '../pages/dashboard/UserProfile'
import ProtectedRoute from './ProtectedRoute'

function HomeRedirect() {
  const { isInitializing, isAuthenticated, role } = useAuth()

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

  return <Navigate to={getDashboardPathByRole(role)} replace />
}

function PublicRoute({ children }) {
  const { isInitializing, isAuthenticated, role } = useAuth()

  if (isInitializing) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPathByRole(role)} replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route
        path="/signin"
        element={
          <PublicRoute>
            <SignIn />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      <Route element={<ProtectedRoute allowedRoles={['USER']} />}>
        <Route path="/dashboard/user" element={<UserDashboard />} />
        <Route path="/dashboard/user/profile" element={<UserProfile />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/dashboard/admin/users" element={<AdminUsersPage />} />
        <Route path="/dashboard/admin/create-technician" element={<CreateTechnicianPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['TECHNICIAN']} />}>
        <Route path="/dashboard/technician" element={<TechnicianDashboardPage />} />
      </Route>

      <Route path="/user-dashboard" element={<Navigate to="/dashboard/user" replace />} />
      <Route path="/user-dashboard/profile" element={<Navigate to="/dashboard/user/profile" replace />} />
      <Route path="/admin-dashboard" element={<Navigate to="/dashboard/admin/users" replace />} />
      <Route path="/technician-dashboard" element={<Navigate to="/dashboard/technician" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
