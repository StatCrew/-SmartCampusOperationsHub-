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
        />

        <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8">
          <section className="mb-8 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-950 p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  Welcome back, {mergedProfile?.fullName?.split(' ')[0] || 'Student'}!
                </h2>
                <p className="mt-2 text-indigo-100/70 max-w-md font-medium">
                  Your campus command center. You have {bookings.filter(b => b.status === 'PENDING').length} pending reservations and {tickets.filter(t => t.status === 'OPEN').length} active support tickets.
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => navigate('/dashboard/user/bookings')} className="bg-white text-indigo-950 hover:bg-indigo-50 border-none shadow-lg px-8">
                  Book Facility
                </Button>
              </div>
            </div>
          </section>
          {profileError ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              <section className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Account</p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-600/20">
                    {initials}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 tracking-tight">{mergedProfile?.fullName || 'User'}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{studentId || 'STUDENT'}</p>
                  </div>
                </div>
                <div className="space-y-4 border-t border-slate-50 pt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Status</span>
                    <Badge variant="success">Verified</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Reservations</span>
                    <span className="text-sm font-black text-slate-900">{bookings.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Requests</span>
                    <span className="text-sm font-black text-slate-900">{tickets.length}</span>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-4">
                <div className="rounded-[2rem] bg-indigo-50 p-6 border border-indigo-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Bookings</p>
                  <h3 className="text-2xl font-black text-indigo-600">{bookings.length}</h3>
                </div>
                <div className="rounded-[2rem] bg-amber-50 p-6 border border-amber-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">Tickets</p>
                  <h3 className="text-2xl font-black text-amber-600">{tickets.length}</h3>
                </div>
              </section>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Profile</h3>
                    <p className="text-sm font-medium text-slate-500">Your contact details and account info.</p>
                  </div>
                  <Button variant="outline" onClick={reloadProfile} className="w-11 h-11 !p-0 rounded-2xl">
                    <span className="material-symbols-outlined">refresh</span>
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</p>
                    <p className="text-sm font-bold text-slate-900">{mergedProfile?.fullName || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                    <p className="text-sm font-bold text-slate-900">{mergedProfile?.email || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</p>
                    <p className="text-sm font-bold text-slate-900">{mergedProfile?.department || 'General'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</p>
                    <p className="text-sm font-bold text-slate-900">{mergedProfile?.phoneNumber || 'Not provided'}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Update Profile</h3>
                    <p className="text-sm font-medium text-slate-500">Change your name, email, or contact info.</p>
                  </div>
                </div>
                <UserProfileDetailsCard
                  loadingProfile={loadingProfile}
                  profile={mergedProfile}
                  onReloadProfile={reloadProfile}
                />
              </section>

              <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                <ActivityFeed
                  activities={activities}
                  title="Recent Activity"
                  subtitle="Latest updates on your bookings and support requests."
                />
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default UserDashboardPage

