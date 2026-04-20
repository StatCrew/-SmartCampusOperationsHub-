import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAllBookings, updateBookingStatus, cancelBookingReq, deleteBooking } from '../../../api/bookingApi'
import { getAllResources } from '../../../api/resourceApi' // 👇 Added to fetch resource names
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

// ── Theme & Status Config (Updated to Violet/Indigo Theme) ───────────────────
const STATUS = {
  PENDING:   { label: 'Pending',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400',   ring: 'ring-amber-100' },
  APPROVED:  { label: 'Approved',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400', ring: 'ring-emerald-100' },
  REJECTED:  { label: 'Rejected',  bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-400',     ring: 'ring-red-100' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200',   dot: 'bg-slate-400',   ring: 'ring-slate-100' },
}

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.CANCELLED
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${s.bg} ${s.text} ${s.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Filter Pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick, count, color }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border transition-all duration-200 ${
        active
          ? `${color ?? 'bg-violet-600 border-violet-600'} text-white shadow-md scale-105`
          : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600 hover:scale-105'
      }`}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
        {count}
      </span>
    </button>
  )
}

// ── Confirm Modal (Handles Approve, Reject, Cancel, Delete) ─────────────────
function ConfirmModal({ open, action, booking, resourceName, onConfirm, onCancel, loading }) {
  if (!open) return null

  // Determine text based on action
  let title, desc, btnClass, btnText, icon, iconBg;
  if (action === 'APPROVED') {
    title = 'Approve Booking?'; desc = 'This will confirm the reservation and notify the user.'; btnClass = 'bg-emerald-500 hover:bg-emerald-600'; btnText = 'Yes, Approve'; icon = '✅'; iconBg = 'bg-emerald-100';
  } else if (action === 'REJECTED') {
    title = 'Reject Booking?'; desc = 'This will decline the request. The user will be notified.'; btnClass = 'bg-red-500 hover:bg-red-600'; btnText = 'Yes, Reject'; icon = '❌'; iconBg = 'bg-red-100';
  } else if (action === 'CANCELLED') {
    title = 'Cancel Booking?'; desc = 'This will revoke an already approved booking and free up the timeslot.'; btnClass = 'bg-amber-500 hover:bg-amber-600'; btnText = 'Yes, Cancel It'; icon = '⚠️'; iconBg = 'bg-amber-100';
  } else if (action === 'DELETE') {
    title = 'Permanently Delete?'; desc = 'This will completely erase this record from the database. This cannot be undone.'; btnClass = 'bg-slate-900 hover:bg-slate-800'; btnText = 'Yes, Delete'; icon = '🗑️'; iconBg = 'bg-slate-200';
  }

  const displayDate = booking?.startTime ? booking.startTime.split('T')[0] : '—'
  const displayTime = booking?.startTime ? `${booking.startTime.split('T')[1].substring(0, 5)} - ${booking.endTime.split('T')[1].substring(0, 5)}` : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-8 animate-[fadeInUp_0.2s_ease]">
        <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${iconBg}`}>
          {icon}
        </div>
        <h3 className="text-xl font-black text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{desc}</p>
        
        {booking && (
          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-xs text-slate-600">
            <div><span className="font-semibold text-slate-800">Booking ID:</span> #{booking.id}</div>
            <div><span className="font-semibold text-slate-800">Resource:</span> {resourceName || `#${booking.resourceId}`}</div>
            <div><span className="font-semibold text-slate-800">Schedule:</span> {displayDate} at {displayTime}</div>
          </div>
        )}
        
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            Close
          </button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white shadow transition disabled:opacity-60 ${btnClass}`}>
            {loading ? 'Processing…' : btnText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Booking Card View ────────────────────────────────────────────────────────
function BookingCard({ booking, resourceName, onAction, processingId, index }) {
  const isPending = booking.status === 'PENDING'
  const isApproved = booking.status === 'APPROVED'
  const isDead = booking.status === 'REJECTED' || booking.status === 'CANCELLED'
  const isProcessing = processingId === booking.id
  const s = STATUS[booking.status] ?? STATUS.CANCELLED

  const displayDate = booking.startTime ? booking.startTime.split('T')[0] : '—'
  const displayStartTime = booking.startTime ? booking.startTime.split('T')[1].substring(0, 5) : '—'
  const displayEndTime = booking.endTime ? booking.endTime.split('T')[1].substring(0, 5) : '—'
  const displayUser = booking.user?.id || booking.userId || 'System'

  return (
    <div className="group relative rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-violet-200 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden" style={{ animationDelay: `${index * 50}ms` }}>
      <div className={`absolute left-0 top-0 h-full w-1.5 ${s.dot}`} />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black ${s.bg} ${s.text} ring-4 ${s.ring} flex-shrink-0`}>
              {booking.id ? `#${String(booking.id).slice(-2)}` : '?'}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Request #{booking.id}</p>
              <p className="text-sm font-bold text-slate-800 line-clamp-1" title={resourceName}>{resourceName || `Resource #${booking.resourceId}`}</p>
            </div>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">User ID</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700 truncate">{displayUser}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 col-span-2 sm:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date & Time</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700">{displayDate} • {displayStartTime}</p>
          </div>
        </div>

        {booking.purpose && (
          <p className="mt-3 text-xs text-slate-500 italic line-clamp-1 border-l-2 border-slate-200 pl-2">"{booking.purpose}"</p>
        )}

        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          {isPending && (
            <>
              <button onClick={() => onAction(booking, 'APPROVED')} disabled={isProcessing} className="flex-1 rounded-xl bg-violet-600 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition shadow-sm hover:shadow-md hover:shadow-violet-200">
                {isProcessing ? '…' : '✓ Approve'}
              </button>
              <button onClick={() => onAction(booking, 'REJECTED')} disabled={isProcessing} className="flex-1 rounded-xl border border-red-200 bg-white py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition">
                {isProcessing ? '…' : '✕ Reject'}
              </button>
            </>
          )}
          {isApproved && (
            <button onClick={() => onAction(booking, 'CANCELLED')} disabled={isProcessing} className="flex-1 rounded-xl border border-amber-200 bg-white py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition">
              {isProcessing ? '…' : '⚠️ Cancel Booking'}
            </button>
          )}
          {isDead && (
            <button onClick={() => onAction(booking, 'DELETE')} disabled={isProcessing} className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 transition flex items-center justify-center gap-1">
              {isProcessing ? '…' : <><span>🗑️</span> Delete Record</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Daily Agenda View (Calendar Alternative) ─────────────────────────────────
function AgendaView({ bookings, resourceMap, onAction, processingId }) {
  // Group bookings by date
  const grouped = bookings.reduce((acc, b) => {
    const date = b.startTime ? b.startTime.split('T')[0] : 'Unknown'
    if (!acc[date]) acc[date] = []
    acc[date].push(b)
    return acc
  }, {})

  // Sort dates
  const sortedDates = Object.keys(grouped).sort()

  if (sortedDates.length === 0) return <EmptyState filter="ALL" />

  return (
    <div className="space-y-6">
      {sortedDates.map(date => (
        <div key={date} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">📅 {date}</h3>
            <span className="text-xs font-semibold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">{grouped[date].length} Bookings</span>
          </div>
          <div className="divide-y divide-slate-100">
            {grouped[date].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).map(b => {
              const resName = resourceMap[b.resourceId] || `Resource #${b.resourceId}`
              const time = `${b.startTime.split('T')[1].substring(0,5)} - ${b.endTime.split('T')[1].substring(0,5)}`
              
              return (
                <div key={b.id} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                  <div className="flex items-center gap-4">
                    <StatusBadge status={b.status} />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{resName}</p>
                      <p className="text-xs text-slate-500">User: {b.user?.id || b.userId || 'System'} • 🕐 {time}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {b.status === 'PENDING' && (
                      <>
                        <button onClick={() => onAction(b, 'APPROVED')} className="px-3 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm">Approve</button>
                        <button onClick={() => onAction(b, 'REJECTED')} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg">Reject</button>
                      </>
                    )}
                    {b.status === 'APPROVED' && (
                      <button onClick={() => onAction(b, 'CANCELLED')} className="px-3 py-1.5 text-xs font-bold text-amber-600 bg-white border border-amber-200 hover:bg-amber-50 rounded-lg">Cancel</button>
                    )}
                    {(b.status === 'REJECTED' || b.status === 'CANCELLED') && (
                      <button onClick={() => onAction(b, 'DELETE')} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg">Delete</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ filter }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
      <div className="mb-4 text-6xl opacity-30">📭</div>
      <h3 className="text-lg font-bold text-slate-700">No bookings found</h3>
      <p className="mt-1 text-sm text-slate-400">
        {filter === 'ALL' ? 'There are no booking requests yet.' : `No ${filter.toLowerCase()} bookings match your criteria.`}
      </p>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminBookingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [bookings,     setBookings]     = useState([])
  const [resourceMap,  setResourceMap]  = useState({}) // 👇 Stores Resource ID -> Name mapping
  const [loading,      setLoading]      = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [processingId, setProcessingId] = useState(null)
  
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search,       setSearch]       = useState('')
  const [viewMode,     setViewMode]     = useState('cards') // 'cards' | 'agenda'

  const [modal, setModal] = useState({ open: false, booking: null, action: null })
  const [modalLoading, setModalLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      // Fetch both Bookings and Resources concurrently
      const [bookingsData, resourcesData] = await Promise.all([
        getAllBookings({ size: 1000 }),
        getAllResources()
      ])

      setBookings(bookingsData?.content || [])

      // Create a map of Resource ID -> Resource Name for fast lookups
      const resMap = {}
      if (Array.isArray(resourcesData)) {
        resourcesData.forEach(r => resMap[r.id] = r.name)
      }
      setResourceMap(resMap)

    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [getApiErrorMessage])

  useEffect(() => { loadData() }, [loadData])

  const handleAction = (booking, action) => {
    setModal({ open: true, booking, action })
  }

  const handleConfirm = async () => {
    setModalLoading(true)
    setProcessingId(modal.booking.id)
    try {
      if (modal.action === 'DELETE') {
        await deleteBooking(modal.booking.id)
      } else if (modal.action === 'CANCELLED') {
        await cancelBookingReq(modal.booking.id)
      } else {
        await updateBookingStatus(modal.booking.id, modal.action)
      }
      
      setModal({ open: false, booking: null, action: null })
      await loadData() // Refresh list
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
      setModal({ open: false, booking: null, action: null })
    } finally {
      setModalLoading(false)
      setProcessingId(null)
    }
  }

  const handleLogout = () => { logout(); navigate('/signin', { replace: true }) }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map(item => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  // Advanced Search filtering logic
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter
      const q = search.toLowerCase()
      
      const dateStr = b.startTime ? b.startTime.split('T')[0] : ''
      const userIdStr = String(b.user?.id || b.userId || '').toLowerCase()
      const resNameStr = (resourceMap[b.resourceId] || '').toLowerCase() // Search by Resource Name!

      const matchSearch = !q
        || String(b.id).includes(q)
        || userIdStr.includes(q)
        || String(b.resourceId ?? '').includes(q)
        || resNameStr.includes(q)
        || dateStr.includes(q)

      return matchStatus && matchSearch
    })
  }, [bookings, statusFilter, search, resourceMap])

  const counts = useMemo(() => ({
    ALL:      bookings.length,
    PENDING:  bookings.filter(b => b.status === 'PENDING').length,
    APPROVED: bookings.filter(b => b.status === 'APPROVED').length,
    REJECTED: bookings.filter(b => b.status === 'REJECTED').length,
  }), [bookings])

  const filters = [
    { key: 'ALL',      label: 'All',      color: 'bg-violet-600 border-violet-600' },
    { key: 'PENDING',  label: 'Pending',  color: 'bg-amber-500 border-amber-500' },
    { key: 'APPROVED', label: 'Approved', color: 'bg-emerald-500 border-emerald-500' },
    { key: 'REJECTED', label: 'Rejected', color: 'bg-red-500 border-red-500' },
    { key: 'CANCELLED',label: 'Cancelled',color: 'bg-slate-500 border-slate-500' },
  ]

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <ConfirmModal
        open={modal.open}
        action={modal.action}
        booking={modal.booking}
        resourceName={resourceMap[modal.booking?.resourceId]}
        onConfirm={handleConfirm}
        onCancel={() => setModal({ open: false, booking: null, action: null })}
        loading={modalLoading}
      />

      <UserSidebar isSidebarExpanded={isSidebarExpanded} onCollapse={() => setIsSidebarExpanded(false)} onExpand={() => setIsSidebarExpanded(true)} onItemNavigate={item => item.path && navigate(item.path)} onLogout={handleLogout} sidebarItems={sidebarItems} />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Admin" title="Booking Management" />

        <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8 space-y-6">

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2 shadow-sm">
              <span>⚠️</span> {errorMessage}
              <button onClick={() => setErrorMessage('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          {/* Header row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Booking Requests</h2>
              <p className="mt-1 text-sm text-slate-500">
                {counts.PENDING > 0 ? `${counts.PENDING} pending request${counts.PENDING > 1 ? 's' : ''} awaiting your review` : 'All requests are resolved'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search Bar matching theme */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search name, ID, or date…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-56 rounded-full border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition shadow-sm"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-slate-200 p-1 rounded-full shadow-inner">
                <button onClick={() => setViewMode('cards')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${viewMode === 'cards' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Cards</button>
                <button onClick={() => setViewMode('agenda')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${viewMode === 'agenda' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Agenda</button>
              </div>

              <button onClick={loadData} className={`flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-violet-600 shadow-sm transition ${loading ? 'opacity-60' : ''}`}>
                <span className={loading ? 'animate-spin inline-block' : ''}>↻</span>
              </button>
            </div>
          </div>

          {/* Summary stat strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total',    value: counts.ALL,      color: 'text-slate-900',   bg: 'bg-white', border: 'border-slate-200' },
              { label: 'Pending',  value: counts.PENDING,  color: 'text-amber-600',   bg: 'bg-amber-50', border: 'border-amber-200' },
              { label: 'Approved', value: counts.APPROVED, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
              { label: 'Rejected', value: counts.REJECTED, color: 'text-red-600',     bg: 'bg-red-50', border: 'border-red-200' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl ${s.bg} border ${s.border} px-5 py-4 shadow-sm transition hover:shadow-md`}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
                <p className={`mt-1 text-3xl font-black tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
              <FilterPill
                key={f.key}
                label={f.label}
                active={statusFilter === f.key}
                count={f.key === 'CANCELLED' ? filtered.filter(b=>b.status==='CANCELLED').length : counts[f.key]}
                color={f.color}
                onClick={() => setStatusFilter(f.key)}
              />
            ))}
          </div>

          {/* Content Area */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 rounded-2xl bg-slate-200" />)}
            </div>
          ) : (
            viewMode === 'cards' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.length === 0 ? <EmptyState filter={statusFilter} /> : filtered.map((booking, i) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    resourceName={resourceMap[booking.resourceId]}
                    onAction={handleAction}
                    processingId={processingId}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <AgendaView 
                bookings={filtered} 
                resourceMap={resourceMap}
                onAction={handleAction} 
                processingId={processingId} 
              />
            )
          )}
        </main>
      </div>
    </div>
  )
}