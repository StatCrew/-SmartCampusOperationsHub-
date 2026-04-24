import { useMemo, useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getUserBookings } from '../../../api/bookingApi'
import { getUserTickets } from '../../../api/ticketApi'
import ActivityFeed from '../../../components/ActivityFeed'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserAccountSummaryCard from './components/UserAccountSummaryCard'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserProfileDetailsCard from './components/UserProfileDetailsCard'
import UserProfileHero from './components/UserProfileHero'
import UserQuickStatsCard from './components/UserQuickStatsCard'
import UserSidebar from './components/UserSidebar'
import useUserProfile from './hooks/useUserProfile'
import { useNotificationContext } from '../../../context/NotificationContext'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

function UserDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, logout, syncProfile, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [tickets, setTickets] = useState([])
  const [bookings, setBookings] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)

  const { notifications } = useNotificationContext()

  const loadDynamicStats = useCallback(async () => {
    if (!user?.id) return

    setLoadingStats(true)
    try {
      const [ticketsData, bookingsData] = await Promise.all([
        getUserTickets({ page: 0, size: 100 }),
        getUserBookings(user.id, { page: 0, size: 100 })
      ])

      setTickets(ticketsData || [])
      setBookings(bookingsData?.content || bookingsData || [])
    } catch (error) {
      console.error('Failed to load user stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadDynamicStats()
  }, [loadDynamicStats])

  const { initials, loadingProfile, mergedProfile, profileError, reloadProfile, studentId } = useUserProfile({
    user,
    role,
    syncProfile,
    getApiErrorMessage,
  })

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const handleSidebarItemNavigate = (item) => {
    if (!item.path) {
      return
    }

    navigate(item.path)
  }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  const headerLabels = getHeaderLabelsByRole(role)

  const dynamicQuickStats = useMemo(() => [
    { label: 'Total Bookings', value: loadingStats ? '—' : bookings.length, valueClassName: 'text-indigo-600' },
    { label: 'Open Tickets', value: loadingStats ? '—' : tickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length, valueClassName: 'text-amber-600' },
  ], [bookings, tickets, loadingStats])

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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={handleSidebarItemNavigate}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader
          onLogout={handleLogout}
          eyebrow={headerLabels.eyebrow}
          title="Student Nexus"
          onToggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
        />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
          <section className="mb-8 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  Welcome back, {mergedProfile?.fullName?.split(' ')[0] || 'Student'}!
                </h2>
                <p className="mt-2 text-indigo-100/70 max-w-md font-medium">
                  Your campus command center. You have {bookings.filter(b => b.status === 'PENDING').length} pending reservations and {tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length} active support tickets.
                </p>
              </div>

            </div>
          </section>

          {profileError && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {profileError}
            </div>
          )}

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Bookings', value: loadingStats ? '—' : bookings.length, icon: 'book_online', color: 'text-indigo-600' },
              { label: 'Active Tickets', value: loadingStats ? '—' : tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED' && t.status !== 'REJECTED').length, icon: 'confirmation_number', color: 'text-amber-600' },
              { label: 'Account Status', value: loadingProfile ? '—' : 'Verified', icon: 'verified_user', color: 'text-emerald-600', isText: true },
              { label: 'Department', value: loadingProfile ? '—' : (mergedProfile?.department || 'General'), icon: 'domain', color: 'text-slate-600', isText: true }
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ${stat.color}`}>
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className={`mt-1 font-black text-slate-900 tracking-tight ${stat.isText ? 'text-xl truncate' : 'text-3xl'}`}>{stat.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="rounded-3xl bg-white shadow-sm border border-slate-100 overflow-hidden h-full">
                <ActivityFeed
                  activities={activities}
                  title="Event Log"
                  subtitle="Recent system notifications and activity"
                />
              </div>
            </div>

            {/* Sidebar: Quick Info */}
            <div className="space-y-6">
              <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Account Overview</p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-600/20">
                    {initials}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 tracking-tight line-clamp-1">{mergedProfile?.fullName || 'User'}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{studentId || 'STUDENT'}</p>
                  </div>
                </div>
                <div className="space-y-4 border-t border-slate-50 pt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Status</span>
                    <Badge variant={profileError ? "danger" : "success"}>{profileError ? 'Error' : 'Verified'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Reservations</span>
                    <span className="text-sm font-black text-slate-900">{bookings.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Requests</span>
                    <span className="text-sm font-black text-slate-900">{tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length}</span>
                  </div>
                </div>
              </section>

              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600 text-[18px]">bolt</span>
                  Quick Links
                </h4>
                <div className="space-y-3">
                  <button onClick={() => navigate('/dashboard/user/resources')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 border border-transparent hover:border-slate-100">
                    <span className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">add_business</span> Book Facility
                    </span>
                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                  </button>
                  <button onClick={() => navigate('/dashboard/user/bookings')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 border border-transparent hover:border-slate-100">
                    <span className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">book_online</span> My Bookings
                    </span>
                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                  </button>
                  <button onClick={() => navigate('/dashboard/user/tickets')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 border border-transparent hover:border-slate-100">
                    <span className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">confirmation_number</span> Support Tickets
                    </span>
                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default UserDashboardPage

