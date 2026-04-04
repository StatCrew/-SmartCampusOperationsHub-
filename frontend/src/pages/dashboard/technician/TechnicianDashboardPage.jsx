import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import apiClient from '../../../api/authService'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

function TechnicianDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, user, logout, syncProfile, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [profile, setProfile] = useState(user)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      setLoadingProfile(true)
      setProfileError('')

      try {
        const response = await apiClient.get('/api/v1/users/me')
        if (!isMounted) {
          return
        }

        setProfile(response.data)
        syncProfile(response.data)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setProfileError(getApiErrorMessage(error))
      } finally {
        if (isMounted) {
          setLoadingProfile(false)
        }
      }
    }

    loadProfile()

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
        />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
          {profileError ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          ) : null}

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Hello, {profile?.fullName || 'Technician'}!</h2>
            <p className="mt-2 text-sm text-slate-600">Your assigned tickets and maintenance requests will appear here.</p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Email</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {loadingProfile ? 'Loading...' : profile?.email || '-'}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Role</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{loadingProfile ? 'Loading...' : profile?.role || role}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Email Status</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {loadingProfile ? 'Loading...' : profile?.emailVerified ? 'Verified' : 'Pending'}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-800">Assigned tickets coming soon</h3>
              <p className="mt-1 text-sm text-slate-600">
                This section will show active tasks, priorities, and progress tracking for technician work.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default TechnicianDashboardPage

