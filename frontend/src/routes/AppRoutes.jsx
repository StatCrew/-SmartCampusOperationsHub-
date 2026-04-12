import { Navigate, Route, Routes } from 'react-router-dom'
import { getDashboardPathByRole } from '../context/authRoles'
import ForgotPassword from '../pages/auth/ForgotPassword'
import OAuthCallback from '../pages/auth/OAuthCallback'
import useAuth from '../context/useAuth'
import SignIn from '../pages/auth/SignIn'
import SignUp from '../pages/auth/SignUp'
import VerifyEmail from '../pages/auth/VerifyEmail'
import AdminDashboardPage from '../pages/dashboard/admin/AdminDashboardPage'
import AdminStorageTestPage from '../pages/dashboard/admin/AdminStorageTestPage'
import AdminUsersPage from '../pages/dashboard/admin/AdminUsersPage'
import CreateUserPage from '../pages/dashboard/admin/CreateUserPage'
import TechnicianDashboardPage from '../pages/dashboard/technician/TechnicianDashboardPage'
import UserDashboard from '../pages/dashboard/UserDashboard'
import UserProfile from '../pages/dashboard/UserProfile'
import ProtectedRoute from './ProtectedRoute'
import AdminBookingAnalyticsPage from '../pages/dashboard/admin/AdminBookingAnalyticsPage'
import AdminBookingsPage from '../pages/dashboard/admin/AdminBookingsPage'
import UserBookingsPage from '../pages/dashboard/user/UserBookingsPage'

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
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['USER', 'ADMIN', 'TECHNICIAN']} />}>
        <Route path="/dashboard/user/profile" element={<UserProfile />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/bookings" element={<AdminBookingsPage />} />
        <Route path="/admin/analytics" element={<AdminBookingAnalyticsPage />} />
        <Route path="/admin/users/create" element={<CreateUserPage />} />
        <Route path="/admin/storage-test" element={<AdminStorageTestPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['TECHNICIAN']} />}>
        <Route path="/dashboard/technician" element={<TechnicianDashboardPage />} />
      </Route>

      <Route path="/user-dashboard" element={<Navigate to="/dashboard/user" replace />} />
      <Route path="/user-dashboard/profile" element={<Navigate to="/dashboard/user/profile" replace />} />
      <Route path="/dashboard/user/bookings" element={<UserBookingsPage />} />
      <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/technician-dashboard" element={<Navigate to="/dashboard/technician" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
