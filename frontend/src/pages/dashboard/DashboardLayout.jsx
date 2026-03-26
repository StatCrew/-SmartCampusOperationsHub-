import { useNavigate } from 'react-router-dom'
import useAuth from '../../context/useAuth'

function DashboardLayout({ title, description }) {
  const navigate = useNavigate()
  const { role, user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Logout
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Role</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{role}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Account</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{user?.email || 'Authenticated user'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardLayout


