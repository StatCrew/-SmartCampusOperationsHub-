import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../../context/useAuth'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'
import { userSidebarItems } from './constants'

function UserOverviewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const sidebarItems = useMemo(
    () => userSidebarItems.map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname],
  )

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={(item) => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader onLogout={handleLogout} />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back, {user?.fullName || 'Student'}!</h2>
            <p className="mt-2 text-sm text-slate-600">
              This is your dashboard overview. Use the sidebar to open profile details, bookings, and tickets.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Total Bookings</p>
                <p className="mt-1 text-2xl font-semibold text-indigo-600">12</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Open Tickets</p>
                <p className="mt-1 text-2xl font-semibold text-amber-600">2</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Email Status</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-600">
                  {user?.emailVerified ? 'Verified' : 'Pending'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/user-dashboard/profile')}
              className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Go to Profile
            </button>
          </section>
        </main>
      </div>
    </div>
  )
}

export default UserOverviewPage

