import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getBookingAnalytics, getAllBookings } from '../../../api/bookingApi'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

// ── Tiny colour-coded badge ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    PENDING:  'bg-amber-100 text-amber-700 border-amber-200',
    APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
    CANCELLED:'bg-slate-100 text-slate-500 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  )
}

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!value) { setDisplay(0); return }
    let start = 0
    const step = Math.ceil(value / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(start)
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])
  return <span>{display.toLocaleString()}</span>
}

// ── Sparkline bar chart (pure CSS/SVG, no deps) ──────────────────────────────
function MiniBarChart({ data = [], color = '#6366f1' }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-500"
          style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.7 + 0.3 * (i / data.length) }}
        />
      ))}
    </div>
  )
}

// ── Donut chart (SVG) ────────────────────────────────────────────────────────
function DonutChart({ segments = [], size = 120 }) {
  const r = 44, cx = 60, cy = 60, circumference = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1
  let offset = 0
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circumference
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease', transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }}
          />
        )
        offset += dash
        return el
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94a3b8">TOTAL</text>
    </svg>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon, trend, sparkData }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className={`absolute right-0 top-0 h-full w-1.5 rounded-r-2xl ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <h3 className="mt-2 text-4xl font-black text-slate-900 tabular-nums">
            <AnimatedNumber value={value || 0} />
          </h3>
          {trend !== undefined && (
            <p className={`mt-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last period
            </p>
          )}
        </div>
        <span className="text-2xl opacity-20 group-hover:opacity-40 transition-opacity">{icon}</span>
      </div>
      {sparkData && <div className="mt-4"><MiniBarChart data={sparkData} color={color.replace('bg-', '').replace('-500', '')} /></div>}
    </div>
  )
}

// ── Recent bookings table ────────────────────────────────────────────────────
function RecentBookingsTable({ bookings, loading }) {
  if (loading) return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-slate-100" />
      ))}
    </div>
  )
  if (!bookings.length) return (
    <div className="py-12 text-center text-slate-400 text-sm">No bookings found.</div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {['Resource', 'User', 'Date', 'Status'].map(h => (
              <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {bookings.map((b, i) => (
            <tr key={b.id ?? i} className="hover:bg-slate-50 transition-colors duration-100">
              <td className="py-3 pr-4 font-medium text-slate-800 truncate max-w-[160px]">{b.resourceName ?? b.resource?.name ?? '—'}</td>
              <td className="py-3 pr-4 text-slate-500 truncate max-w-[140px]">{b.userName ?? b.user?.name ?? b.userId ?? '—'}</td>
              <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">
                {b.startTime ? new Date(b.startTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </td>
              <td className="py-3"><StatusBadge status={b.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Status filter pill ───────────────────────────────────────────────────────
function FilterPill({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-150 ${
        active
          ? 'bg-slate-900 text-white border-slate-900 shadow'
          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-slate-100'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
function AdminBookingAnalyticsPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [analytics, setAnalytics]   = useState(null)
  const [bookings,  setBookings]    = useState([])
  const [loading,   setLoading]     = useState(true)
  const [tableLoad, setTableLoad]   = useState(true)
  const [error,     setError]       = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search,    setSearch]      = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,      setPage]        = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Load analytics summary
  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getBookingAnalytics()
      setAnalytics(data)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [getApiErrorMessage])

  // Load paginated booking list
  const loadBookings = useCallback(async () => {
    setTableLoad(true)
    try {
      const params = {
        page,
        size: 8,
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(debouncedSearch && { search: debouncedSearch }),
      }
      const result = await getAllBookings(params)
      setBookings(result.content ?? [])
      setTotalPages(result.totalPages ?? 1)
    } catch (err) {
      console.error('Failed to load bookings', err)
    } finally {
      setTableLoad(false)
    }
  }, [page, statusFilter, debouncedSearch])

  useEffect(() => { loadAnalytics() }, [loadAnalytics, refreshKey])
  useEffect(() => { loadBookings()  }, [loadBookings,  refreshKey])

  // Reset page when filter/search changes
  useEffect(() => { setPage(0) }, [statusFilter, debouncedSearch])

  const handleLogout = () => { logout(); navigate('/signin', { replace: true }) }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map(item => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  // Derived donut segments
  const donutSegments = analytics ? [
    { label: 'Approved', value: analytics.approvedRequests || 0, color: '#10b981' },
    { label: 'Pending',  value: analytics.pendingRequests  || 0, color: '#f59e0b' },
    { label: 'Rejected', value: analytics.rejectedRequests || 0, color: '#ef4444' },
  ] : []

  const statusCounts = {
    ALL:      analytics ? (analytics.totalBookings || 0) : 0,
    PENDING:  analytics?.pendingRequests  || 0,
    APPROVED: analytics?.approvedRequests || 0,
    REJECTED: analytics?.rejectedRequests || 0,
  }

  const approvalRate = analytics && analytics.totalBookings > 0
    ? Math.round((analytics.approvedRequests / analytics.totalBookings) * 100)
    : 0

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={item => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Admin" title="Campus Analytics" />

        <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8 space-y-8">

          {/* Error banner */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <span>⚠️</span> {error}
              <button onClick={() => { setError(''); setRefreshKey(k => k + 1) }} className="ml-auto text-red-400 hover:text-red-600 text-xs underline">Retry</button>
            </div>
          )}

          {/* ── Top strip: title + refresh ── */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Booking Analytics</h2>
              <p className="mt-0.5 text-sm text-slate-500">Review campus resource utilization and request statuses.</p>
            </div>
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <span className={loading ? 'animate-spin inline-block' : ''}>↻</span> Refresh
            </button>
          </div>

          {/* ── KPI cards ── */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-36 rounded-2xl bg-slate-200" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Bookings"  value={analytics?.totalBookings}     color="bg-indigo-500"  icon="📋" />
              <StatCard label="Pending"         value={analytics?.pendingRequests}    color="bg-amber-400"   icon="⏳" />
              <StatCard label="Approved"        value={analytics?.approvedRequests}   color="bg-emerald-500" icon="✅" />
              <StatCard label="Rejected"        value={analytics?.rejectedRequests}   color="bg-red-500"     icon="❌" />
            </div>
          )}

          {/* ── Insights row ── */}
          {!loading && analytics && (
            <div className="grid gap-4 md:grid-cols-3">

              {/* Donut chart */}
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 flex flex-col">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Status Breakdown</h3>
                <div className="flex items-center gap-6 flex-1">
                  <DonutChart segments={donutSegments} size={120} />
                  <ul className="space-y-2 text-xs">
                    {donutSegments.map(s => (
                      <li key={s.label} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-slate-500">{s.label}</span>
                        <span className="ml-auto font-bold text-slate-800">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Approval rate gauge */}
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
                <h3 className="text-sm font-bold text-slate-700">Approval Rate</h3>
                <div className="mt-4">
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-slate-900">{approvalRate}<span className="text-2xl text-slate-400">%</span></span>
                  </div>
                  <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                      style={{ width: `${approvalRate}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {analytics.approvedRequests} approved out of {analytics.totalBookings} total
                  </p>
                </div>
              </div>

              {/* Quick stats */}
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Quick Insights</h3>
                <ul className="space-y-3 text-sm">
                  {[
                    {
                      label: 'Rejection Rate',
                      value: analytics.totalBookings > 0
                        ? `${Math.round((analytics.rejectedRequests / analytics.totalBookings) * 100)}%`
                        : '—',
                      color: 'text-red-500',
                    },
                    {
                      label: 'Pending Rate',
                      value: analytics.totalBookings > 0
                        ? `${Math.round((analytics.pendingRequests / analytics.totalBookings) * 100)}%`
                        : '—',
                      color: 'text-amber-500',
                    },
                    {
                      label: 'Resolved',
                      value: (analytics.approvedRequests || 0) + (analytics.rejectedRequests || 0),
                      color: 'text-indigo-600',
                    },
                    {
                      label: 'Awaiting Action',
                      value: analytics.pendingRequests || 0,
                      color: 'text-slate-700',
                    },
                  ].map(item => (
                    <li key={item.label} className="flex items-center justify-between">
                      <span className="text-slate-500">{item.label}</span>
                      <span className={`font-bold ${item.color}`}>{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ── Bookings table ── */}
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="border-b border-slate-100 px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-bold text-slate-800">Recent Bookings</h3>
              {/* Search */}
              <div className="relative max-w-xs w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search bookings…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm placeholder-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-6 py-3 bg-slate-50/60">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                <FilterPill
                  key={s}
                  label={s === 'ALL' ? 'All Bookings' : s.charAt(0) + s.slice(1).toLowerCase()}
                  active={statusFilter === s}
                  count={statusCounts[s]}
                  onClick={() => setStatusFilter(s)}
                />
              ))}
            </div>

            {/* Table body */}
            <div className="px-6 py-4">
              <RecentBookingsTable bookings={bookings} loading={tableLoad} />
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
                <span className="text-xs text-slate-400">Page {page + 1} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}

export default AdminBookingAnalyticsPage
