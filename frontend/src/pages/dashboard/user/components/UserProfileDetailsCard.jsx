function UserProfileDetailsCard({ loadingProfile, profile, onReloadProfile }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Profile Details</h3>
        <button
          type="button"
          onClick={onReloadProfile}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Refresh Data
        </button>
      </div>

      {loadingProfile ? (
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Full Name</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
              {profile.fullName}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
              {profile.email}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Role</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
              {profile.role}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Account Source</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
              {profile.provider}
            </div>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500">Profile details are loaded from `GET /api/v1/auth/me`.</p>
    </section>
  )
}

export default UserProfileDetailsCard

