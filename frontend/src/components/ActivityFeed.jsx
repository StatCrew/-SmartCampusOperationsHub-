function formatTimeAgo(dateString) {
  if (!dateString) return 'Just now'
  
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)
  
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' years ago'
  
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' months ago'
  
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' days ago'
  
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' hours ago'
  
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' mins ago'
  
  return 'Just now'
}

function getActivityIcon(type) {
  switch (type) {
    case 'TICKET':
      return <span className="material-symbols-outlined text-amber-500">confirmation_number</span>
    case 'BOOKING':
      return <span className="material-symbols-outlined text-blue-500">event_available</span>
    case 'USER':
      return <span className="material-symbols-outlined text-emerald-500">person_add</span>
    default:
      return <span className="material-symbols-outlined text-slate-500">info</span>
  }
}

function getStatusBadge(status) {
  if (!status) return null

  const normalizedStatus = String(status).toUpperCase()
  
  const styles = {
    OPEN: 'bg-amber-100 text-amber-700',
    PENDING: 'bg-amber-100 text-amber-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    RESOLVED: 'bg-emerald-100 text-emerald-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    CLOSED: 'bg-slate-100 text-slate-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  const badgeStyle = styles[normalizedStatus] || 'bg-slate-100 text-slate-700'

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${badgeStyle}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function ActivityFeed({ activities = [], title = "Recent Activity", subtitle = "Latest updates across the campus" }) {
  if (!activities || activities.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{subtitle}</p>
        <div className="py-8 text-center text-sm text-slate-500">No recent activity to display.</div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>

      <div className="relative">
        {/* Vertical line for the timeline */}
        <div className="absolute left-6 top-2 bottom-2 w-px bg-slate-100" />
        
        <div className="space-y-6">
          {activities.map((activity, index) => (
            <div key={`${activity.id}-${index}`} className="relative flex gap-4">
              <div className="relative z-10 grid h-12 w-12 flex-shrink-0 place-items-center rounded-full border-4 border-white bg-slate-50 shadow-sm">
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex flex-1 flex-col justify-center sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {activity.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {activity.subtitle} • {formatTimeAgo(activity.date)}
                  </p>
                </div>
                <div className="mt-2 sm:mt-0 flex items-center gap-2">
                  {getStatusBadge(activity.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ActivityFeed
