import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getUsers, sendAdminTestNotification } from '../../../api/adminApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

function AdminDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, user, logout, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSendingNotification, setIsSendingNotification] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const data = await getUsers({ page: 0, size: 1000 })
      setUsers(data?.content || [])
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [getApiErrorMessage])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const handleSendSelfNotification = async () => {
    if (!user?.id) {
      return
    }

    setIsSendingNotification(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await sendAdminTestNotification({
        recipientUserId: user.id,
        title: 'Test Notification',
        message: 'Notification system is working.',
        actionUrl: '/admin/dashboard',
      })
      setSuccessMessage('Test notification sent. Check the bell icon.')
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsSendingNotification(false)
    }
  }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  const headerLabels = getHeaderLabelsByRole(role)
  const activeUsers = users.filter((item) => item.active).length
  const roleCounts = users.reduce(
    (acc, item) => {
      acc[item.role] = (acc[item.role] || 0) + 1
      return acc
    },
    { USER: 0, ADMIN: 0, TECHNICIAN: 0 },
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
        <UserDashboardHeader onLogout={handleLogout} eyebrow={headerLabels.eyebrow} title={headerLabels.title} />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
          {errorMessage ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
          {successMessage ? (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back, {user?.fullName || 'Admin'}!</h2>
            <p className="mt-1 text-sm text-slate-600">Monitor users and manage the campus account base from here.</p>
            <button
              type="button"
              onClick={handleSendSelfNotification}
              disabled={isSendingNotification}
              className="mt-4 rounded-lg border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendingNotification ? 'Sending...' : 'Send Test Notification'}
            </button>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Total Users</p>
              <h3 className="mt-2 text-3xl font-bold text-slate-900">{loading ? '—' : users.length}</h3>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Active Users</p>
              <h3 className="mt-2 text-3xl font-bold text-slate-900">{loading ? '—' : activeUsers}</h3>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Users by Role</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-slate-100 px-3 py-1">USER: {roleCounts.USER}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">ADMIN: {roleCounts.ADMIN}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">TECHNICIAN: {roleCounts.TECHNICIAN}</span>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
                <p className="text-sm text-slate-600">Recently added users</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/users')}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Manage Users
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {(users.slice(0, 5) || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.fullName}</p>
                    <p className="text-sm text-slate-500">{item.email}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {item.role}
                  </span>
                </div>
              ))}
              {!loading && users.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No users found.</p>
              ) : null}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default AdminDashboardPage

