function UserDashboardHeader({ onLogout }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Student Profile</p>
        <h1 className="text-xl font-semibold text-slate-900">My Account</h1>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Logout
      </button>
    </header>
  )
}

export default UserDashboardHeader

