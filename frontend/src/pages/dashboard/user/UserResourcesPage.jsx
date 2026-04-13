import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getAllResources,
  RESOURCE_TYPES,
  formatResourceType,
} from '../../../api/resourceApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

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
                    <th className="px-5 py-3 text-left">Availability</th>
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
                        <td className="px-5 py-4 text-slate-500 text-xs">{resource.availabilityWindow || '—'}</td>
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
    </div>
  )
}

export default UserResourcesPage
