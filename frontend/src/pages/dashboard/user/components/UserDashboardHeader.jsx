import { useNavigate } from 'react-router-dom'
import useAuth from '../../../../context/useAuth'

function getInitials(nameOrEmail) {
  const source = (nameOrEmail || '').trim()
  if (!source) {
    return 'U'
  }

  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

function UserDashboardHeader({ eyebrow = 'Student Profile', title = 'My Account' }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const avatarUrl = user?.imageUrl || user?.avatarUrl || user?.profileImageUrl || null
  const avatarFallback = getInitials(user?.fullName || user?.email)

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          aria-label="Notifications"
          title="Notifications"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard/user/profile')}
          className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-200"
          aria-label="Profile"
          title="Profile"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span>{avatarFallback}</span>
          )}
        </button>
      </div>
    </header>
  )
}

export default UserDashboardHeader
