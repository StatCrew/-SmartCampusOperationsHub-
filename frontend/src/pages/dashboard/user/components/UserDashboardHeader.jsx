import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../../../context/useAuth'
import useNotifications from '../hooks/useNotifications'

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
  const { role, user, getApiErrorMessage } = useAuth()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const {
    notifications,
    unreadCount,
    isLoading,
    errorMessage,
    markOneAsRead,
    markAllAsRead,
  } = useNotifications({ getApiErrorMessage })

  const avatarUrl = user?.imageUrl || user?.avatarUrl || user?.profileImageUrl || null
  const avatarFallback = getInitials(user?.fullName || user?.email)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!dropdownRef.current) {
        return
      }

      if (!dropdownRef.current.contains(event.target)) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await markOneAsRead(notification.id)
      } catch {
        // Keep UX non-blocking; polling refreshes state.
      }
    }

    setIsNotificationsOpen(false)

    if (!notification.actionUrl) {
      return
    }

    if (notification.actionUrl.startsWith('http://') || notification.actionUrl.startsWith('https://')) {
      window.location.assign(notification.actionUrl)
      return
    }

    navigate(notification.actionUrl)
  }

  const handleProfileNavigate = () => {
    navigate('/dashboard/user/profile')
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((previous) => !previous)}
            className="relative grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Notifications"
            title="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 ? (
              <span className="absolute right-1 top-1 min-w-5 rounded-full bg-rose-500 px-1.5 text-center text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          {isNotificationsOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-indigo-600 transition hover:text-indigo-700"
                >
                  Mark all read
                </button>
              </div>

              {errorMessage ? <p className="mb-2 text-xs text-red-600">{errorMessage}</p> : null}
              {isLoading ? <p className="py-4 text-center text-xs text-slate-500">Loading...</p> : null}

              {!isLoading && notifications.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">No notifications yet.</p>
              ) : null}

              <div className="max-h-80 space-y-1 overflow-y-auto">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition hover:bg-slate-50 ${
                      notification.read ? 'bg-white' : 'bg-indigo-50/70'
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-900">{notification.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{notification.message}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleProfileNavigate}
          className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-200"
          aria-label="Profile"
          title={`${role || 'USER'} Profile`}
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
