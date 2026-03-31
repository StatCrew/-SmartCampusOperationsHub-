import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserAccountSummaryCard from './components/UserAccountSummaryCard'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserProfileDetailsCard from './components/UserProfileDetailsCard'
import UserProfileHero from './components/UserProfileHero'
import UserQuickStatsCard from './components/UserQuickStatsCard'
import UserSidebar from './components/UserSidebar'
import { userQuickStats } from './constants'
import useUserProfile from './hooks/useUserProfile'

function UserDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, logout, syncProfile, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

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
          title={headerLabels.title}
        />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
          {profileError ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          ) : null}

          <UserProfileHero initials={initials} loadingProfile={loadingProfile} profile={mergedProfile} />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="space-y-4 lg:col-span-1">
              <UserAccountSummaryCard profile={mergedProfile} studentId={studentId} />
              <UserQuickStatsCard stats={userQuickStats} />
            </section>

            <UserProfileDetailsCard
              loadingProfile={loadingProfile}
              profile={mergedProfile}
              onReloadProfile={reloadProfile}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default UserDashboardPage

