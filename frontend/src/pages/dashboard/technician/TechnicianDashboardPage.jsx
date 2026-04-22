import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import apiClient from '../../../api/authService'
import { getTechnicianTickets } from '../../../api/ticketApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'
import ActivityFeed from '../../../components/ActivityFeed'
import { useNotificationContext } from '../../../context/NotificationContext'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

function TechnicianDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, user, logout, syncProfile, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [profile, setProfile] = useState(user)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(true)

  const { notifications } = useNotificationContext()

  useEffect(() => {
    let isMounted = true

    const loadDashboardData = async () => {
      setLoadingProfile(true)
      setLoadingTickets(true)
      setProfileError('')

      try {
        const [profileRes, ticketsData] = await Promise.all([
          apiClient.get('/api/v1/users/me').catch(err => { throw err }),
          getTechnicianTickets({ page: 0, size: 100 }).catch(() => [])
        ])
        
        if (!isMounted) return

        setProfile(profileRes.data)
        syncProfile(profileRes.data)
        setTickets(ticketsData || [])
      } catch (error) {
        if (!isMounted) return
        setProfileError(getApiErrorMessage(error))
      } finally {
        if (isMounted) {
          setLoadingProfile(false)
          setLoadingTickets(false)
        }
      }
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [getApiErrorMessage, syncProfile])

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  const headerLabels = getHeaderLabelsByRole(role)

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
        onItemNavigate={(item) => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader
          onLogout={handleLogout}
          eyebrow={headerLabels.eyebrow}
          title="Mission Nexus"
        />

        <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8">
          <section className="mb-8 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  Hello, {profile?.fullName || 'Technician'}!
                </h2>
                <p className="mt-2 text-indigo-100/70 max-w-md font-medium">
                  Operational Control: You have {tickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length} critical issues requiring intervention.
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => navigate('/dashboard/technician/tickets')} 
                  className="bg-indigo-500/20 text-white border border-indigo-400/30 hover:bg-indigo-500/40 shadow-lg shadow-indigo-500/10 backdrop-blur-sm"
                >
                  Manage Queue
                </Button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Assigned</p>
              <h3 className="text-3xl font-black text-slate-900">{loadingTickets ? '—' : tickets.length}</h3>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Pending Action</p>
              <h3 className="text-3xl font-black text-amber-600">
                {loadingTickets ? '—' : tickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length}
              </h3>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Identity Auth</p>
              <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest mt-3">
                {loadingProfile ? 'Checking...' : profile?.emailVerified ? 'Verified' : 'Pending'}
              </h3>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Access Level</p>
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest mt-3">
                {loadingProfile ? 'Loading...' : profile?.role || role}
              </h3>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
            <ActivityFeed 
              activities={activities} 
              title="Operational Stream"
              subtitle="Latest assigned tasks and system alerts requiring attention."
            />
          </section>
        </main>
      </div>
    </div>
  )
}

export default TechnicianDashboardPage

