function UserAccountSummaryCard({ profile, studentId }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Account Summary</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Student ID</dt>
          <dd className="font-medium text-slate-900">{studentId}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Provider</dt>
          <dd className="font-medium text-slate-900">{profile.provider}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Email Status</dt>
          <dd
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              profile.emailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {profile.emailVerified ? 'Verified' : 'Not Verified'}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export default UserAccountSummaryCard

