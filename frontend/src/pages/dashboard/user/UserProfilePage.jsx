import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'
import UserProfileDetailsCard from './components/UserProfileDetailsCard'
import useUserProfile from './hooks/useUserProfile'
import { Button } from '../../../components/ui/Button'

function UserProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, logout, syncProfile, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)

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
          title="Profile Settings"
        />

        <main className="mx-auto w-full max-w-4xl p-4 pb-24 md:p-8">
          <section className="mb-8 rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Your Profile</h3>
                <p className="text-sm font-medium text-slate-500">Manage your personal information and contact details.</p>
              </div>
              <Button variant="outline" onClick={reloadProfile} className="w-11 h-11 !p-0 rounded-2xl border-slate-200 text-slate-500 hover:bg-slate-50">
                <span className="material-symbols-outlined">refresh</span>
              </Button>
            </div>

            <div className="flex items-center gap-6 mb-10 pb-10 border-b border-slate-50">
              <div className="h-24 w-24 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-600/20">
                {initials}
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">{mergedProfile?.fullName || 'User'}</h4>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{studentId || 'STUDENT'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Active Account</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</p>
                <p className="text-base font-bold text-slate-900">{mergedProfile?.fullName || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</p>
                <p className="text-base font-bold text-slate-900">{mergedProfile?.email || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department / School</p>
                <p className="text-base font-bold text-slate-900">{mergedProfile?.department || 'General'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</p>
                <p className="text-base font-bold text-slate-900">{mergedProfile?.phoneNumber || 'Not provided'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Edit Profile Details</h3>
              <p className="text-sm font-medium text-slate-500">Update your information below. Changes will be reflected across the platform.</p>
            </div>
            
            {profileError && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <span className="material-symbols-outlined text-[20px]">error</span>
                {profileError}
              </div>
            )}

            <UserProfileDetailsCard
              loadingProfile={loadingProfile}
              profile={mergedProfile}
              onReloadProfile={reloadProfile}
            />
          </section>
        </main>
      </div>
    </div>
  )
}

export default UserProfilePage
