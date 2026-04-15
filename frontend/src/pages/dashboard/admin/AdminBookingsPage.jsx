import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAllBookings, updateBookingStatus } from '../../../api/bookingApi'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

// ── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  PENDING:   { label: 'Pending',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400',   ring: 'ring-amber-100' },
  APPROVED:  { label: 'Approved',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400', ring: 'ring-emerald-100' },
  REJECTED:  { label: 'Rejected',  bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-400',     ring: 'ring-red-100' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200',   dot: 'bg-slate-300',   ring: 'ring-slate-100' },
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
          ? `${color ?? 'bg-slate-900 border-slate-900'} text-white shadow-md scale-105`
          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:scale-105'
      }`}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
        {count}
      </span>
    </button>
  )
}

// ── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ open, action, booking, onConfirm, onCancel, loading }) {
  if (!open) return null
  const isApprove = action === 'APPROVED'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-8 animate-[fadeInUp_0.2s_ease]">
        <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${isApprove ? 'bg-emerald-100' : 'bg-red-100'}`}>
          {isApprove ? '✅' : '❌'}
        </div>
        <h3 className="text-xl font-black text-slate-900">
          {isApprove ? 'Approve Booking?' : 'Reject Booking?'}
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          {isApprove
            ? 'This will confirm the reservation and notify the user.'
            : 'This will decline the request. The user will be notified.'}
        </p>
        {booking && (
          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-1 text-xs text-slate-600">
            <div><span className="font-semibold">Booking ID:</span> #{booking.id}</div>
            <div><span className="font-semibold">Resource:</span> #{booking.resourceId}</div>
            <div><span className="font-semibold">Date:</span> {booking.bookingDate}</div>
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white shadow transition disabled:opacity-60 ${
              isApprove ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {loading ? 'Processing…' : isApprove ? 'Yes, Approve' : 'Yes, Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, onAction, processingId, index }) {
  const isPending = booking.status === 'PENDING'
  const isProcessing = processingId === booking.id
  const s = STATUS[booking.status] ?? STATUS.CANCELLED

  return (
    <div
      className="group relative rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 h-full w-1 ${s.dot}`} />

      <div className="p-5 pl-6">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black ${s.bg} ${s.text} ring-4 ${s.ring} flex-shrink-0`}>
              {booking.id ? `#${String(booking.id).slice(-2)}` : '?'}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Booking Request</p>
              <p className="text-sm font-bold text-slate-800">ID #{booking.id}</p>
            </div>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {/* Details grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">User</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700 truncate">{booking.userId ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resource</p>
            <p className="mt-0.5 text-sm font-semibold text-indigo-600">#{booking.resourceId ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700">{booking.bookingDate ?? '—'}</p>
          </div>
        </div>

        {/* Time slot */}
        {(booking.startTime || booking.endTime) && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-slate-300">🕐</span>
            <span className="font-medium">{booking.startTime}</span>
            <span className="text-slate-300">→</span>
            <span className="font-medium">{booking.endTime}</span>
          </div>
        )}

        {/* Purpose / notes */}
        {booking.purpose && (
          <p className="mt-3 text-xs text-slate-400 italic line-clamp-1">"{booking.purpose}"</p>
        )}

        {/* Action buttons */}
        {isPending && (
          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
            <button
              onClick={() => onAction(booking, 'APPROVED')}
              disabled={isProcessing}
              className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50 transition shadow-sm hover:shadow-emerald-200 hover:shadow-md"
            >
              {isProcessing ? '…' : '✓ Approve'}
            </button>
            <button
              onClick={() => onAction(booking, 'REJECTED')}
              disabled={isProcessing}
              className="flex-1 rounded-xl border border-red-200 bg-white py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
            >
              {isProcessing ? '…' : '✕ Reject'}
            </button>
          </div>
        )}

        {!isPending && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-400 font-medium">Resolved — no action needed</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ filter }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 text-6xl opacity-30">📭</div>
      <h3 className="text-lg font-bold text-slate-700">No bookings found</h3>
      <p className="mt-1 text-sm text-slate-400">
        {filter === 'ALL' ? 'There are no booking requests yet.' : `No ${filter.toLowerCase()} bookings at the moment.`}
      </p>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
function AdminBookingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [bookings,     setBookings]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search,       setSearch]       = useState('')
  const [modal, setModal] = useState({ open: false, booking: null, action: null })
  const [modalLoading, setModalLoading] = useState(false)

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const data = await getAllBookings({ size: 100 })
      setBookings(data?.content || [])
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [getApiErrorMessage])

  useEffect(() => { loadBookings() }, [loadBookings])

  const handleAction = (booking, action) => {
    setModal({ open: true, booking, action })
  }

  const handleConfirm = async () => {
    setModalLoading(true)
    setProcessingId(modal.booking.id)
    try {
      await updateBookingStatus(modal.booking.id, modal.action)
      setModal({ open: false, booking: null, action: null })
      await loadBookings()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
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

  // Filter & search
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter
      const q = search.toLowerCase()
      const matchSearch = !q
        || String(b.id).includes(q)
        || String(b.userId ?? '').toLowerCase().includes(q)
        || String(b.resourceId ?? '').includes(q)
        || String(b.bookingDate ?? '').includes(q)
      return matchStatus && matchSearch
    })
  }, [bookings, statusFilter, search])

  const counts = useMemo(() => ({
    ALL:      bookings.length,
    PENDING:  bookings.filter(b => b.status === 'PENDING').length,
    APPROVED: bookings.filter(b => b.status === 'APPROVED').length,
    REJECTED: bookings.filter(b => b.status === 'REJECTED').length,
  }), [bookings])

  const filters = [
    { key: 'ALL',      label: 'All',      color: 'bg-slate-800 border-slate-800' },
    { key: 'PENDING',  label: 'Pending',  color: 'bg-amber-500 border-amber-500' },
    { key: 'APPROVED', label: 'Approved', color: 'bg-emerald-500 border-emerald-500' },
    { key: 'REJECTED', label: 'Rejected', color: 'bg-red-500 border-red-500' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <ConfirmModal
        open={modal.open}
        action={modal.action}
        booking={modal.booking}
        onConfirm={handleConfirm}
        onCancel={() => setModal({ open: false, booking: null, action: null })}
        loading={modalLoading}
      />

      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={item => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Admin" title="Booking Management" />

        <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8 space-y-6">

          {/* Error banner */}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <span>⚠️</span> {errorMessage}
              <button onClick={() => setErrorMessage('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          {/* Header row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Booking Requests</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {counts.PENDING > 0
                  ? `${counts.PENDING} pending request${counts.PENDING > 1 ? 's' : ''} awaiting your review`
                  : 'All requests are resolved'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search bookings…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-48 rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition shadow-sm"
                />
              </div>
              <button
                onClick={loadBookings}
                className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition ${loading ? 'opacity-60' : ''}`}
              >
                <span className={loading ? 'animate-spin inline-block' : ''}>↻</span>
                Refresh
              </button>
            </div>
          </div>

          {/* Summary stat strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total',    value: counts.ALL,      color: 'text-slate-900',   bg: 'bg-white' },
              { label: 'Pending',  value: counts.PENDING,  color: 'text-amber-600',   bg: 'bg-amber-50' },
              { label: 'Approved', value: counts.APPROVED, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Rejected', value: counts.REJECTED, color: 'text-red-600',     bg: 'bg-red-50' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl ${s.bg} border border-slate-100 px-5 py-4 shadow-sm`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
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
                count={counts[f.key]}
                color={f.color}
                onClick={() => setStatusFilter(f.key)}
              />
            ))}
          </div>

          {/* Cards grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-52 rounded-2xl bg-slate-200" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.length === 0
                ? <EmptyState filter={statusFilter} />
                : filtered.map((booking, i) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onAction={handleAction}
                      processingId={processingId}
                      index={i}
                    />
                  ))
              }
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default AdminBookingsPage
