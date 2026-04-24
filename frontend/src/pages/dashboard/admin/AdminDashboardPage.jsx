import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getUsers, sendAdminTestNotification } from '../../../api/adminApi'
import { getAllBookings } from '../../../api/bookingApi'
import { getAdminTickets } from '../../../api/ticketApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'
import ActivityFeed from '../../../components/ActivityFeed'
import { useNotificationContext } from '../../../context/NotificationContext'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

function AdminDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, user, logout, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [users, setUsers] = useState([])
  const [tickets, setTickets] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')


  const { notifications } = useNotificationContext()

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const results = await Promise.allSettled([
        getUsers({ page: 0, size: 1000 }),
        getAdminTickets({ page: 0, size: 100 }),
        getAllBookings({ page: 0, size: 100 })
      ])

      const usersData = results[0].status === 'fulfilled' ? results[0].value : { content: [] }
      const ticketsData = results[1].status === 'fulfilled' ? results[1].value : []
      const bookingsData = results[2].status === 'fulfilled' ? results[2].value : { content: [] }

      setUsers(usersData?.content || [])
      setTickets(ticketsData || [])
      setBookings(bookingsData?.content || bookingsData || [])
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


  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  const headerLabels = getHeaderLabelsByRole(role)

  const roleCounts = useMemo(() => {
    return users.reduce(
      (acc, item) => {
        const r = item.role?.toUpperCase() || 'USER'
        acc[r] = (acc[r] || 0) + 1
        return acc
      },
      { USER: 0, ADMIN: 0, TECHNICIAN: 0, TECH: 0 },
    )
  }, [users])

  const activities = useMemo(() => {
    return notifications.map(n => ({
      id: `notification-${n.id}`,
      type: n.category === 'TICKET' ? 'TICKET' : n.category === 'BOOKING' ? 'BOOKING' : n.category === 'SYSTEM' ? 'SYSTEM' : 'GENERAL',
      title: n.title,
      subtitle: n.message,
      date: n.createdAt,
      status: n.read ? 'READ' : 'UNREAD'
    })).slice(0, 10)
  }, [notifications])

  const quickStats = [
    { label: 'Total Users', value: loading ? '—' : users.length, icon: 'group', color: 'text-indigo-600' },
    { label: 'Active Tickets', value: loading ? '—' : tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'REJECTED').length, icon: 'confirmation_number', color: 'text-amber-600' },
    { label: 'Total Bookings', value: loading ? '—' : bookings.length, icon: 'book_online', color: 'text-emerald-600' },
    { label: 'System Health', value: '100%', icon: 'bolt', color: 'text-rose-600' },
  ]

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
        <UserDashboardHeader 
          onLogout={handleLogout} 
          eyebrow={headerLabels.eyebrow} 
          title={headerLabels.title} 
          onToggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
        />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
          {/* Hero Section */}
          <section className="mb-8 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Admin Overview</h2>
                <p className="mt-2 text-indigo-100/70 max-w-md">
                  Welcome back, {user?.fullName || 'Administrator'}. Monitor system performance and manage campus operations from one central hub.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={loadDashboard}
                  className="bg-indigo-500/20 text-white border border-indigo-400/30 hover:bg-indigo-500/40 shadow-lg shadow-indigo-500/10 backdrop-blur-sm"
                >
                  <span className="material-symbols-outlined mr-2">refresh</span> Sync Data
                </Button>
              </div>
            </div>
          </section>

          {errorMessage && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {errorMessage}
            </div>
          )}

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {quickStats.map((stat, i) => (
              <div key={i} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ${stat.color}`}>
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                  {i === 0 && (
                    <div className="flex gap-1">
                      <span title="Users" className="text-[10px] font-bold text-slate-400">U:{roleCounts.USER}</span>
                      <span title="Technicians" className="text-[10px] font-bold text-slate-400">T:{roleCounts.TECHNICIAN + roleCounts.TECH}</span>
                      <span title="Admins" className="text-[10px] font-bold text-slate-400">A:{roleCounts.ADMIN}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="mt-1 text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Main Content: Activity */}
            <div className="lg:col-span-2">
              <ActivityFeed
                activities={activities}
                title="Event Log"
                subtitle="Recent system notifications and activity"
              />
            </div>

            {/* Sidebar: Quick Info */}
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600 text-[18px]">bolt</span>
                  Quick Links
                </h4>
                <div className="space-y-3">
                  <button onClick={() => navigate('/admin/users')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 border border-transparent hover:border-slate-100">
                    <span className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">group</span> Manage Users
                    </span>
                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                  </button>
                  <button onClick={() => navigate('/admin/bookings')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 border border-transparent hover:border-slate-100">
                    <span className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">list_alt</span> Booking Requests
                    </span>
                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                  </button>
                  <button onClick={() => navigate('/admin/tickets')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 border border-transparent hover:border-slate-100">
                    <span className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">confirmation_number</span> Support Tickets
                    </span>
                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-indigo-600 p-6 text-white shadow-lg shadow-indigo-200">
                <h4 className="text-sm font-bold uppercase tracking-widest mb-2 opacity-80">System Status</h4>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xl font-black">All Systems Online</span>
                </div>
                <p className="text-xs opacity-70 leading-relaxed">
                  The infrastructure is currently performing within optimal parameters. No outages reported in the last 24 hours.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminDashboardPage

