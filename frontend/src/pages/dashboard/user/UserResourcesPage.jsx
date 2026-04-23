import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getAllResources,
  getAvailabilitySlots,
  RESOURCE_TYPES,
  formatResourceType,
} from '../../../api/resourceApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'
import CreateBookingModal from './components/CreateBookingModal'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

// ─── Schedule grid constants ──────────────────────────────────────────────────
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const DAY_SHORT = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' }
const HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19']

function slotsToKeys(slots) {
  const keys = new Set()
  slots.forEach(s => {
    const hour = s.startTime.slice(0, 2)
    if (HOURS.includes(hour)) keys.add(`${s.dayOfWeek}-${hour}`)
  })
  return keys
}

// ─── Read-only schedule view modal ───────────────────────────────────────────
function ScheduleViewModal({ resource, onClose }) {
  const [activeKeys, setActiveKeys] = useState(new Set())
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    getAvailabilitySlots(resource.id)
      .then(slots => setActiveKeys(slotsToKeys(slots)))
      .catch(() => setActiveKeys(new Set()))
      .finally(() => setLoading(false))
  }, [resource.id])

  const hasAnySlot = activeKeys.size > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Availability Schedule</h2>
            <p className="text-xs text-slate-500 mt-0.5">{resource.name} · weekly recurring slots</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="overflow-auto px-6 py-5 flex-1">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading schedule...</div>
          ) : !hasAnySlot ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-3xl text-slate-300">calendar_month</span>
              <p className="mt-2 text-sm text-slate-400">No availability schedule set for this resource.</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-4 w-4 rounded bg-emerald-500" /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-4 w-4 rounded border border-slate-200 bg-slate-100" /> Not available
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="border-separate border-spacing-1">
                  <thead>
                    <tr>
                      <th className="w-12" />
                      {HOURS.map(h => (
                        <th key={h} className="w-9 text-center text-[10px] font-semibold text-slate-400 pb-1">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(day => (
                      <tr key={day}>
                        <td className="pr-2 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{DAY_SHORT[day]}</td>
                        {HOURS.map(hour => {
                          const active = activeKeys.has(`${day}-${hour}`)
                          return (
                            <td key={hour}>
                              <div
                                title={active ? `${DAY_SHORT[day]} ${hour}:00–${String(+hour+1).padStart(2,'0')}:00` : undefined}
                                className={`h-7 w-9 rounded ${active ? 'bg-emerald-500' : 'bg-slate-100 border border-slate-200'}`}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-400">Hour labels are start times (08 = 08:00–09:00). Green slots repeat every week.</p>
            </>
          )}
        </div>

        <div className="flex flex-shrink-0 justify-end border-t border-slate-100 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Resource type icon map ───────────────────────────────────────────────────
const TYPE_ICON = {
  LECTURE_HALL: 'school',
  LAB: 'science',
  MEETING_ROOM: 'groups',
  SPORTS_FACILITY: 'sports_soccer',
  STUDY_ROOM: 'menu_book',
}
function resourceIcon(type) { return TYPE_ICON[type] || 'inventory_2' }

// ─── Resource card ────────────────────────────────────────────────────────────
function ResourceCard({ resource, onViewSchedule, onBook }) {
  const isUnavailable = resource.status === 'OUT_OF_SERVICE'
  return (
    <div className="group flex flex-col rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Image / placeholder */}
      <div className="relative h-40 bg-slate-100 flex-shrink-0">
        {resource.imageUrl ? (
          <img src={resource.imageUrl} alt={resource.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-slate-300">{resourceIcon(resource.type)}</span>
          </div>
        )}
        {/* Status pill */}
        <span className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm ${
          isUnavailable ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {isUnavailable ? 'Out of Service' : 'Available'}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{formatResourceType(resource.type)}</p>
          <h3 className="text-base font-bold text-slate-900 leading-snug">{resource.name}</h3>
        </div>

        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="material-symbols-outlined text-base text-slate-400">location_on</span>
            {resource.location}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="material-symbols-outlined text-base text-slate-400">group</span>
            Capacity: {resource.capacity}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onViewSchedule(resource)}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:border-slate-300"
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={() => onBook(resource)}
            disabled={isUnavailable}
            className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function UserResourcesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true) // expanded by default
  const [resources, setResources]                 = useState([])
  const [loading, setLoading]                     = useState(true)
  const [errorMessage, setErrorMessage]           = useState('')

  const [scheduleViewTarget, setScheduleViewTarget] = useState(null)
  const [bookingTarget, setBookingTarget] = useState(null)

  // Filters
  const [search,       setSearch]       = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const loadResources = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const data = await getAllResources()
      setResources(data)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [getApiErrorMessage])

  useEffect(() => { loadResources() }, [loadResources])

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const q = search.toLowerCase()
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.location.toLowerCase().includes(q)
      const matchType   = !filterType   || r.type   === filterType
      const matchStatus = !filterStatus || r.status === filterStatus
      return matchSearch && matchType && matchStatus
    })
  }, [resources, search, filterType, filterStatus])

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  const headerLabels = getHeaderLabelsByRole(role)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {scheduleViewTarget ? (
        <ScheduleViewModal resource={scheduleViewTarget} onClose={() => setScheduleViewTarget(null)} />
      ) : null}

      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={(item) => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader
          onLogout={handleLogout}
          eyebrow={headerLabels.eyebrow}
          title="Resources"
        />

        <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8">
          {errorMessage ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {/* Hero */}
          <section className="mb-8 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-950 p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Campus Resources</h2>
                <p className="mt-2 text-indigo-100/70 font-medium">
                  {loading ? 'Loading...' : `${resources.length} resource${resources.length !== 1 ? 's' : ''} available across campus`}
                </p>
              </div>
              <button
                type="button"
                onClick={loadResources}
                className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition backdrop-blur-sm"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Refresh
              </button>
            </div>
          </section>

          {/* Summary chips */}
          {!loading && resources.length > 0 ? (
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {RESOURCE_TYPES.map((type) => {
                const count = resources.filter((r) => r.type === type).length
                return (
                  <div
                    key={type}
                    onClick={() => setFilterType(filterType === type ? '' : type)}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                      filterType === type
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${filterType === type ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {formatResourceType(type)}
                    </p>
                    <p className={`text-2xl font-black ${filterType === type ? 'text-white' : 'text-slate-900'}`}>{count}</p>
                  </div>
                )
              })}
            </div>
          ) : null}

          {/* Filters row */}
          <div className="mb-6 flex flex-wrap gap-3 items-center">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resources..."
                className="pl-9 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-64"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All Types</option>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{formatResourceType(t)}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Available</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
            {(search || filterType || filterStatus) ? (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilterType(''); setFilterStatus('') }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-base">close</span>
                Clear
              </button>
            ) : null}
            <span className="ml-auto text-sm text-slate-500">
              {loading ? 'Loading...' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Card grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden animate-pulse">
                  <div className="h-40 bg-slate-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-20 bg-slate-200 rounded" />
                    <div className="h-5 w-3/4 bg-slate-200 rounded" />
                    <div className="h-3 w-1/2 bg-slate-200 rounded" />
                    <div className="h-3 w-1/3 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">inventory_2</span>
              <p className="text-lg font-bold text-slate-400">No resources found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onViewSchedule={setScheduleViewTarget}
                  onBook={(r) => navigate(`/dashboard/user/resources/${r.id}`)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <CreateBookingModal
        isOpen={!!bookingTarget}
        selectedResource={bookingTarget}
        onClose={() => setBookingTarget(null)}
        onSuccess={() => navigate('/dashboard/user/bookings')}
      />
    </div>
  )
}

export default UserResourcesPage
