function UserQuickStatsCard({ stats }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Quick Stats</h3>
      <div className="mt-4 space-y-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`text-xl font-semibold ${stat.valueClassName}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UserQuickStatsCard

