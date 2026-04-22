import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  createResource,
  deleteResource,
  getAllResources,
  getAvailabilitySlots,
  replaceAvailabilitySlots,
  RESOURCE_STATUSES,
  RESOURCE_TYPES,
  updateResource,
  uploadResourceImage,
  formatResourceType,
} from '../../../api/resourceApi'
import { sendAdminRoleBroadcast } from '../../../api/adminApi'
import useAuth from '../../../context/useAuth'
import useToast from '../../../context/useToast'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

// ─── Schedule grid constants ──────────────────────────────────────────────────
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const DAY_SHORT = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' }
const HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19']

function slotKey(day, hour) { return `${day}-${hour}` }

function slotsToKeys(slots) {
  const keys = new Set()
  slots.forEach(s => {
    const hour = s.startTime.slice(0, 2)
    if (HOURS.includes(hour)) keys.add(slotKey(s.dayOfWeek, hour))
  })
  return keys
}

function keysToPayload(keys) {
  return Array.from(keys).map(key => {
    const [day, hour] = key.split('-')
    const next = String(+hour + 1).padStart(2, '0')
    return { dayOfWeek: day, startTime: `${hour}:00`, endTime: `${next}:00` }
  })
}

// ─── Initial form state ───────────────────────────────────────────────────────
const emptyForm = {
  name:        '',
  type:        'LECTURE_HALL',
  capacity:    '',
  location:    '',
  status:      'ACTIVE',
  description: '',
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

// ─── Resource form modal ──────────────────────────────────────────────────────
function ResourceModal({ initialData, onClose, onSaved, getApiErrorMessage }) {
  const isEditing = Boolean(initialData?.id)
  const [form, setForm]           = useState(initialData ? {
    name:        initialData.name        ?? '',
    type:        initialData.type        ?? 'LECTURE_HALL',
    capacity:    initialData.capacity    ?? '',
    location:    initialData.location    ?? '',
    status:      initialData.status      ?? 'ACTIVE',
    description: initialData.description ?? '',
  } : emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving]       = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl ?? null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFormError('')
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const validate = () => {
    if (!form.name.trim())     return 'Resource name is required.'
    if (!form.capacity || Number(form.capacity) < 1) return 'Capacity must be at least 1.'
    if (!form.location.trim()) return 'Location is required.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setFormError(err); return }

    setSaving(true)
    setFormError('')

    try {
      const payload = {
        name:        form.name,
        type:        form.type,
        capacity:    Number(form.capacity),
        location:    form.location,
        status:      form.status,
        description: form.description || null,
      }

      let saved = isEditing
        ? await updateResource(initialData.id, payload)
        : await createResource(payload)

      if (imageFile) {
        saved = await uploadResourceImage(saved.id, imageFile)
      }

      // Broadcast to Admins about new resource
      if (!isEditing) {
        try {
          await sendAdminRoleBroadcast({
            targetRole: 'ADMIN',
            title: 'New Resource Added',
            message: `Resource "${saved.name}" has been added to the campus inventory at ${saved.location}.`,
            actionUrl: '/admin/resource-analytics',
            category: 'SYSTEM'
          });
        } catch (notiErr) { console.error('Broadcast failed:', notiErr); }
      }

      onSaved(saved, isEditing)
    } catch (error) {
      setFormError(getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="flex w-full max-w-lg max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl">
        {/* Sticky header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? 'Edit Resource' : 'Add New Resource'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="overflow-y-auto px-6 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Resource Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              placeholder="e.g. Lab A101"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* Type + Status side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>{formatResourceType(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                {RESOURCE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s === 'ACTIVE' ? 'Active' : 'Out of Service'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Capacity + Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Capacity <span className="text-red-500">*</span>
              </label>
              <input
                name="capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={handleChange}
                placeholder="e.g. 30"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Block A, Floor 2"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
              <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              placeholder="Additional details about this resource..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Image
              <span className="ml-1 text-xs font-normal text-slate-400">(optional, max 5 MB)</span>
            </label>
            {imagePreview ? (
              <div className="mb-2">
                <img
                  src={imagePreview}
                  alt="preview"
                  className="h-28 w-full rounded-lg object-cover border border-slate-200"
                />
              </div>
            ) : null}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {formError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Resource'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}

// ─── Schedule editor modal (admin) ────────────────────────────────────────────
function ScheduleModal({ resource, onClose, getApiErrorMessage, showSuccess, showError }) {
  const [activeKeys, setActiveKeys] = useState(new Set())
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    setLoading(true)
    getAvailabilitySlots(resource.id)
      .then(slots => setActiveKeys(slotsToKeys(slots)))
      .catch(() => setActiveKeys(new Set()))
      .finally(() => setLoading(false))
  }, [resource.id])

  const toggleCell = (day, hour) => {
    const key = slotKey(day, hour)
    setActiveKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await replaceAvailabilitySlots(resource.id, keysToPayload(activeKeys))
      showSuccess(`Schedule saved for "${resource.name}".`)
      onClose()
    } catch (err) {
      showError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Availability Schedule</h2>
            <p className="text-xs text-slate-500 mt-0.5">{resource.name} · click cells to toggle 1-hour slots</p>
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
          ) : (
            <>
              {/* Legend */}
              <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-4 w-4 rounded bg-indigo-500" /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-4 w-4 rounded border border-slate-200 bg-slate-100" /> Unavailable
                </span>
              </div>

              {/* Hour header row */}
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
                          const active = activeKeys.has(slotKey(day, hour))
                          return (
                            <td key={hour}>
                              <button
                                type="button"
                                title={`${DAY_SHORT[day]} ${hour}:00–${String(+hour+1).padStart(2,'0')}:00`}
                                onClick={() => toggleCell(day, hour)}
                                className={`h-7 w-9 rounded transition-colors ${
                                  active
                                    ? 'bg-indigo-500 hover:bg-indigo-600'
                                    : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
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
                Hour labels are start times (08 = 08:00–09:00). Each cell = one bookable slot.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 justify-between items-center border-t border-slate-100 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <span className="text-xs text-slate-500">
            {activeKeys.size} slot{activeKeys.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function AdminResourcesPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()
  const { showSuccess, showError }           = useToast()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [resources, setResources]                 = useState([])
  const [loading, setLoading]                     = useState(true)
  const [errorMessage, setErrorMessage]           = useState('')

  // Resource CRUD modal
  const [modalOpen, setModalOpen]     = useState(false)
  const [editTarget, setEditTarget]   = useState(null)

  // Schedule editor modal
  const [scheduleTarget, setScheduleTarget] = useState(null)

  // Filters
  const [search,       setSearch]       = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Delete confirmation
  const [deletingId, setDeletingId] = useState(null)

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

  const handleOpenCreate = () => {
    setEditTarget(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (resource) => {
    setEditTarget(resource)
    setModalOpen(true)
  }

  const handleModalSaved = (saved, wasEditing) => {
    if (wasEditing) {
      setResources((prev) => prev.map((r) => (r.id === saved.id ? saved : r)))
      showSuccess('Resource updated successfully.')
    } else {
      setResources((prev) => [...prev, saved])
      showSuccess('Resource added successfully.')
    }
    setModalOpen(false)
    setEditTarget(null)
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await deleteResource(id)
      setResources((prev) => prev.filter((r) => r.id !== id))
      showSuccess('Resource deleted.')
    } catch (error) {
      showError(getApiErrorMessage(error))
    } finally {
      setDeletingId(null)
    }
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
      {modalOpen ? (
        <ResourceModal
          initialData={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null) }}
          onSaved={handleModalSaved}
          getApiErrorMessage={getApiErrorMessage}
        />
      ) : null}

      {scheduleTarget ? (
        <ScheduleModal
          resource={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          getApiErrorMessage={getApiErrorMessage}
          showSuccess={showSuccess}
          showError={showError}
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
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">All Resources</h2>
              <p className="text-sm text-slate-500">
                {loading ? 'Loading...' : `${filtered.length} resource${filtered.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Add Resource
            </button>
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
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                        Loading resources...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-sm text-slate-400">
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
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setScheduleTarget(resource)}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            Edit Schedule
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={resource.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(resource)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(resource.id)}
                              disabled={deletingId === resource.id}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === resource.id ? '...' : 'Delete'}
                            </button>
                          </div>
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

export default AdminResourcesPage
