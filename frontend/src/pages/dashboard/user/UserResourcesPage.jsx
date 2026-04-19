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
// Add booking modal to the imports
import CreateBookingModal from './components/CreateBookingModal'

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
    setLoading(true)
    getAvailabilitySlots(resource.id)
      .then(slots => setActiveKeys(slotsToKeys(slots)))
      .catch(() => setActiveKeys(new Set()))
      .finally(() => setLoading(false))
  }, [resource.id])

  const hasAnySlot = activeKeys.size > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Availability Schedule</h2>
            <p className="text-xs text-slate-500 mt-0.5">{resource.name} · weekly recurring slots</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Grid body */}
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
              {/* Legend */}
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
                        <th key={h} className="w-9 text-center text-[10px] font-semibold text-slate-400 pb-1">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(day => (
                      <tr key={day}>
                        <td className="pr-2 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">
                          {DAY_SHORT[day]}
                        </td>
                        {HOURS.map(hour => {
                          const active = activeKeys.has(`${day}-${hour}`)
                          return (
                            <td key={hour}>
                              <div
                                title={active ? `${DAY_SHORT[day]} ${hour}:00–${String(+hour+1).padStart(2,'0')}:00` : undefined}
                                className={`h-7 w-9 rounded ${
                                  active
                                    ? 'bg-emerald-500'
                                    : 'bg-slate-100 border border-slate-200'
                                }`}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Hour labels are start times (08 = 08:00–09:00). Green slots repeat every week.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 justify-end border-t border-slate-100 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Status badge helper ──────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cls =
    status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-red-50 text-red-600'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status === 'ACTIVE' ? 'Active' : 'Out of Service'}
    </span>
  )
}

// ─── Main Page (read-only for USER role) ─────────────────────────────────────
function UserResourcesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [resources, setResources]                 = useState([])
  const [loading, setLoading]                     = useState(true)
  const [errorMessage, setErrorMessage]           = useState('')

  // Schedule view modal
  const [scheduleViewTarget, setScheduleViewTarget] = useState(null)
  
  // Booking modal
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
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)
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
        <ScheduleViewModal
          resource={scheduleViewTarget}
          onClose={() => setScheduleViewTarget(null)}
        />
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
          title="Resource Catalogue"
        />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
          {errorMessage ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {/* Header row */}
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">All Resources</h2>
            <p className="text-sm text-slate-500">
              {loading ? 'Loading...' : `${filtered.length} resource${filtered.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or location..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:w-64"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">All Types</option>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{formatResourceType(t)}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
            {(search || filterType || filterStatus) ? (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilterType(''); setFilterStatus('') }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Clear
              </button>
            ) : null}
          </div>

          {/* Table */}
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 text-left">Image</th>
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left">Type</th>
                    <th className="px-5 py-3 text-left">Location</th>
                    <th className="px-5 py-3 text-left">Capacity</th>
                    <th className="px-5 py-3 text-left">Schedule</th>
                    <th className="px-5 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                        Loading resources...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                        No resources found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((resource) => (
                      <tr key={resource.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          {resource.imageUrl ? (
                            <img
                              src={resource.imageUrl}
                              alt={resource.name}
                              className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                              <span className="material-symbols-outlined text-base text-slate-400">image</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-900">{resource.name}</td>
                        <td className="px-5 py-4 text-slate-600">{formatResourceType(resource.type)}</td>
                        <td className="px-5 py-4 text-slate-600">{resource.location}</td>
                        <td className="px-5 py-4 text-slate-600">{resource.capacity}</td>
                        {/* 👇 FIXED BUTTONS CONTAINER 👇 */}
                        <td className="px-5 py-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setScheduleViewTarget(resource)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            View Schedule
                          </button>
                          
                          <button
                         type="button"
                         
                         onClick={() => navigate(`/dashboard/user/resources/${resource.id}`)}
                         disabled={resource.status === 'OUT_OF_SERVICE'}
                         className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         Book Room
                       </button>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={resource.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Summary cards */}
          {!loading && resources.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {RESOURCE_TYPES.map((type) => {
                const count = resources.filter((r) => r.type === type).length
                return (
                  <div key={type} className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">{formatResourceType(type)}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{count}</p>
                  </div>
                )
              })}
            </div>
          ) : null}
        </main>
      </div>
      {/* adding booking modal */}
      <CreateBookingModal 
        isOpen={!!bookingTarget} 
        selectedResource={bookingTarget} // Pass the selected resource data!
        onClose={() => setBookingTarget(null)} 
        onSuccess={() => navigate('/dashboard/user/bookings')} // Send them to see their booking!
      />
    </div>
  )
}

export default UserResourcesPage
