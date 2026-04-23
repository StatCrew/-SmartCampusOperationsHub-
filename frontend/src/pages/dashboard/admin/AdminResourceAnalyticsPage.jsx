import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAllResources, RESOURCE_TYPES, formatResourceType } from '../../../api/resourceApi'
import { getAllBookings } from '../../../api/bookingApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

// ── Config ─────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  LECTURE_HALL: { label: 'Lecture Hall', color: 'text-blue-600', bg: 'bg-blue-50', icon: 'school' },
  LAB:          { label: 'Laboratory',   color: 'text-indigo-600', bg: 'bg-indigo-50', icon: 'science' },
  MEETING_ROOM: { label: 'Meeting Room', color: 'text-purple-600', bg: 'bg-purple-50', icon: 'handshake' },
  EQUIPMENT:    { label: 'Equipment',    color: 'text-amber-600', bg: 'bg-amber-50', icon: 'settings' },
}

// ── KPI Stat Card ──────────────────────────────────────────────────
function StatCard({ label, value, icon, colorClass, sub, delay = 0 }) {
  return (
    <div className={`rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both`} style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ${colorClass}`}>
          <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <h3 className="mt-1 text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
      {sub && <p className="mt-2 text-xs font-medium text-slate-500">{sub}</p>}
    </div>
  )
}

// ── Custom SVG Charts ─────────────────────────────────────────────
function CustomPieChart({ data, colors }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = 0

  return (
    <div className="relative h-48 w-48 mx-auto">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {data.map((item, i) => {
          if (item.value === 0) return null
          const startAngle = currentAngle
          const angle = (item.value / total) * 360
          currentAngle += angle

          // Path for doughnut slice
          const x1 = 50 + 40 * Math.cos((Math.PI * startAngle) / 180)
          const y1 = 50 + 40 * Math.sin((Math.PI * startAngle) / 180)
          const x2 = 50 + 40 * Math.cos((Math.PI * (startAngle + angle)) / 180)
          const y2 = 50 + 40 * Math.sin((Math.PI * (startAngle + angle)) / 180)

          const largeArcFlag = angle > 180 ? 1 : 0

          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="12"
              className="transition-all duration-700 hover:opacity-80 cursor-pointer"
              strokeLinecap="round"
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-slate-900">{total}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</span>
      </div>
    </div>
  )
}

function CustomBarChart({ data, color }) {
  const max = Math.max(...data.map(d => d.value), 1)
  
  return (
    <div className="space-y-4">
      {data.map((item, i) => (
        <div key={i} className="group">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[11px] font-bold text-slate-600 truncate max-w-[180px]">{item.label}</span>
            <span className="text-[11px] font-black text-slate-900">{item.value}</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${color}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminResourceAnalyticsPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [resources,  setResources]  = useState([])
  const [bookings,   setBookings]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [sortBy,     setSortBy]     = useState('bookings')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const loadData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [res, bkgs] = await Promise.all([
        getAllResources(),
        getAllBookings({ size: 1000 }),
      ])
      setResources(Array.isArray(res) ? res : [])
      setBookings(bkgs?.content ?? [])
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [getApiErrorMessage])

  useEffect(() => { loadData() }, [loadData])

  const handleLogout = () => { logout(); navigate('/signin', { replace: true }) }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map(i => ({ ...i, active: i.path === location.pathname })),
    [location.pathname, role],
  )

  const headerLabels = getHeaderLabelsByRole(role)

  // ── Compute analytics ──────────────────────────────────────────
  const bookingsByResource = useMemo(() => {
    const map = {}
    for (const b of bookings) {
      const id = String(b.resourceId)
      if (!map[id]) map[id] = { total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 }
      map[id].total++
      const s = (b.status || '').toUpperCase()
      if (s === 'APPROVED') map[id].approved++
      if (s === 'PENDING') map[id].pending++
      if (s === 'REJECTED') map[id].rejected++
      if (s === 'CANCELLED') map[id].cancelled++
    }
    return map
  }, [bookings])

  const enrichedResources = useMemo(() => {
    return resources.map(r => ({
      ...r,
      ...(bookingsByResource[String(r.id)] || { total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 }),
    }))
  }, [resources, bookingsByResource])

  const filteredResources = useMemo(() => {
    const base = typeFilter === 'ALL' ? enrichedResources : enrichedResources.filter(r => r.type === typeFilter)
    return [...base].sort((a, b) => {
      if (sortBy === 'bookings') return b.total - a.total
      if (sortBy === 'name')     return a.name.localeCompare(b.name)
      if (sortBy === 'capacity') return b.capacity - a.capacity
      return 0
    })
  }, [enrichedResources, typeFilter, sortBy])

  const totalResources    = resources.length
  const activeResources   = resources.filter(r => r.status === 'ACTIVE').length
  const bookedResources   = enrichedResources.filter(r => r.total > 0).length
  const totalBookings     = bookings.length
  const utilizationRate   = totalResources > 0 ? Math.round((bookedResources / totalResources) * 100) : 0
  const approvedBookings  = bookings.filter(b => (b.status || '').toUpperCase() === 'APPROVED').length
  const approvalRate      = totalBookings > 0 ? Math.round((approvedBookings / totalBookings) * 100) : 0

  const typeCounts = useMemo(() => {
    const c = { ALL: enrichedResources.length }
    for (const t of Object.keys(TYPE_CONFIG)) c[t] = enrichedResources.filter(r => r.type === t).length
    return c
  }, [enrichedResources])

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
        <UserDashboardHeader onLogout={handleLogout} eyebrow={headerLabels.eyebrow} title="Resource Analytics" />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">

          {/* Hero Section */}
          <section className="mb-8 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Usage Analytics</h2>
                <p className="mt-2 text-indigo-100/70 max-w-md">
                  Monitor facility utilization, demand trends, and operational efficiency across the campus.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={loadData}
                  className="bg-indigo-500/20 text-white border border-indigo-400/30 hover:bg-indigo-500/40 shadow-lg shadow-indigo-500/10 backdrop-blur-sm"
                >
                  <span className="material-symbols-outlined mr-2 text-[20px]">refresh</span> Refresh Analytics
                </Button>
              </div>
            </div>
          </section>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {error}
            </div>
          )}

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Inventory" value={loading ? '—' : totalResources} icon="inventory_2" colorClass="text-indigo-600" sub={`${activeResources} Active Resources`} />
            <StatCard label="Utilization" value={loading ? '—' : `${utilizationRate}%`} icon="analytics" colorClass="text-emerald-600" sub={`${bookedResources} Resources used`} />
            <StatCard label="Total Volume" value={loading ? '—' : totalBookings} icon="confirmation_number" colorClass="text-amber-600" sub="Combined requests" />
            <StatCard label="Approval Ratio" value={loading ? '—' : `${approvalRate}%`} icon="task_alt" colorClass="text-rose-600" sub={`${approvedBookings} Validations`} />
          </div>

          {/* Visual Insights Section */}
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Distribution */}
            <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Usage by Category</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Resource allocation</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">pie_chart</span>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-12 w-full">
                <CustomPieChart 
                  data={Object.entries(TYPE_CONFIG).map(([type, cfg]) => ({
                    label: cfg.label,
                    value: typeCounts[type] || 0
                  }))}
                  colors={['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc']}
                />
                <div className="flex-1 space-y-3 w-full">
                  {Object.entries(TYPE_CONFIG).map(([type, cfg], i) => {
                    const count = typeCounts[type] || 0
                    const percent = typeCounts.ALL > 0 ? Math.round((count / typeCounts.ALL) * 100) : 0
                    const colors = ['bg-indigo-600', 'bg-indigo-500', 'bg-indigo-400', 'bg-indigo-300']
                    
                    return (
                      <div key={type} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-slate-100/50 group hover:border-indigo-100 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full ${colors[i % colors.length]}`} />
                          <span className="text-[11px] font-bold text-slate-600">{cfg.label}</span>
                        </div>
                        <span className="text-[11px] font-black text-slate-900">{percent}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* Top Resources Bar Chart */}
            <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Top Demand Resources</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Highest utilization</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">leaderboard</span>
                </div>
              </div>

              <CustomBarChart 
                data={enrichedResources
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 5)
                  .map(r => ({ label: r.name, value: r.total }))
                }
                color="bg-amber-500"
              />
              
              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                  * Based on total historical booking volume
                </p>
              </div>
            </section>
          </div>

          {/* Filters & Table */}
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 mb-8">
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${typeFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  All Types ({typeCounts.ALL})
                </button>
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 ${typeFilter === type ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{cfg.icon}</span>
                    {cfg.label} ({typeCounts[type] || 0})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sort By</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer outline-none"
                >
                  <option value="bookings">Demand (High to Low)</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="capacity">Capacity (Largest)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50 text-left">
                    <th className="pb-4 pt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Resource</th>
                    <th className="pb-4 pt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Type</th>
                    <th className="pb-4 pt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Capacity</th>
                    <th className="pb-4 pt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 text-center">Total Bookings</th>
                    <th className="pb-4 pt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Status</th>
                    <th className="pb-4 pt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="py-4 px-4"><div className="h-10 bg-slate-50 rounded-xl" /></td>
                      </tr>
                    ))
                  ) : filteredResources.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm font-medium">No resources match the selected criteria.</td>
                    </tr>
                  ) : filteredResources.map((r) => {
                    const typeCfg = TYPE_CONFIG[r.type] || { label: r.type, color: 'text-slate-600', bg: 'bg-slate-50', icon: 'domain' }
                    const appRate = r.total > 0 ? Math.round((r.approved / r.total) * 100) : 0

                    return (
                      <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl ${typeCfg.bg} ${typeCfg.color} flex items-center justify-center`}>
                              <span className="material-symbols-outlined text-[20px]">{typeCfg.icon}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 leading-none">{r.name}</p>
                              <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.location || 'Central Campus'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${typeCfg.bg} ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-700">{r.capacity}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">seats</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-lg font-black text-slate-900">{r.total}</span>
                        </td>
                        <td className="py-4 px-4">
                          <Badge status={r.status} />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${appRate > 70 ? 'bg-emerald-500' : appRate > 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${appRate}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-black text-slate-900 min-w-[32px]">{appRate}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
