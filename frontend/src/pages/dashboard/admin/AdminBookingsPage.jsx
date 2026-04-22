import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAllBookings, updateBookingStatus, cancelBookingReq, deleteBooking } from '../../../api/bookingApi';
import { getAllResources } from '../../../api/resourceApi';
import useAuth from '../../../context/useAuth';
import { getSidebarItemsByRole } from '../constants';
import UserDashboardHeader from '../user/components/UserDashboardHeader';
import UserSidebar from '../user/components/UserSidebar';

/**
 * Configuration object defining the visual properties for booking statuses.
 * Utilizes Tailwind CSS classes for consistency and rapid styling.
 */
const STATUS = {
  PENDING:   { label: 'Pending',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400',   ring: 'ring-amber-100' },
  APPROVED:  { label: 'Approved',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400', ring: 'ring-emerald-100' },
  REJECTED:  { label: 'Rejected',  bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-400',     ring: 'ring-red-100' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200',   dot: 'bg-slate-400',   ring: 'ring-slate-100' },
};

/**
 * Renders a stylized badge indicating the current status of a booking.
 */
function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.CANCELLED;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${s.bg} ${s.text} ${s.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/**
 * Interactive pill component used for filtering the bookings list.
 */
function FilterPill({ label, active, onClick, count, colorClass }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border transition-all duration-200 ${
        active
          ? `${colorClass ?? 'bg-indigo-600 border-indigo-600'} text-white shadow-sm`
          : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'
      }`}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
        {count}
      </span>
    </button>
  );
}

/**
 * Modal dialogue for confirming administrative actions (Approve, Reject, Cancel, Delete).
 */
function ConfirmModal({ open, action, booking, resourceName, onConfirm, onCancel, loading }) {
  if (!open) return null;

  let title, desc, btnClass, btnText, icon, iconBg;
  
  switch (action) {
    case 'APPROVED':
      title = 'Approve Booking?'; desc = 'Confirm this reservation and notify the user.'; btnClass = 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'; btnText = 'Yes, Approve'; icon = '✓'; iconBg = 'bg-emerald-100 text-emerald-600';
      break;
    case 'REJECTED':
      title = 'Reject Booking?'; desc = 'Decline this request. The user will be notified.'; btnClass = 'bg-red-600 hover:bg-red-700 text-white border-transparent'; btnText = 'Yes, Reject'; icon = '✕'; iconBg = 'bg-red-100 text-red-600';
      break;
    case 'CANCELLED':
      title = 'Cancel Booking?'; desc = 'Revoke this approved booking and free up the timeslot.'; btnClass = 'bg-amber-500 hover:bg-amber-600 text-white border-transparent'; btnText = 'Yes, Cancel It'; icon = '!'; iconBg = 'bg-amber-100 text-amber-600';
      break;
    case 'DELETE':
      title = 'Permanently Delete?'; desc = 'Completely erase this record from the database. Cannot be undone.'; btnClass = 'bg-slate-900 hover:bg-slate-800 text-white border-transparent'; btnText = 'Yes, Delete'; icon = '🗑'; iconBg = 'bg-slate-100 text-slate-700';
      break;
    default:
      return null;
  }

  const displayDate = booking?.startTime ? booking.startTime.split('T')[0] : '—';
  const displayTime = booking?.startTime ? `${booking.startTime.split('T')[1].substring(0, 5)} - ${booking.endTime.split('T')[1].substring(0, 5)}` : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-8 transform transition-all">
        <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold ${iconBg}`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{desc}</p>
        
        {booking && (
          <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm text-slate-700">
            <div className="flex justify-between"><span className="font-medium text-slate-500">Booking ID:</span> <span>#{booking.id}</span></div>
            <div className="flex justify-between"><span className="font-medium text-slate-500">Resource:</span> <span className="font-medium text-indigo-700">{resourceName || `#${booking.resourceId}`}</span></div>
            <div className="flex justify-between"><span className="font-medium text-slate-500">Schedule:</span> <span>{displayDate} at {displayTime}</span></div>
          </div>
        )}
        
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1 ${btnClass}`}>
            {loading ? 'Processing…' : btnText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Card component to display individual booking requests in a grid layout.
 */
function BookingCard({ booking, resourceName, onAction, processingId }) {
  const isPending = booking.status === 'PENDING';
  const isApproved = booking.status === 'APPROVED';
  const isDead = booking.status === 'REJECTED' || booking.status === 'CANCELLED';
  const isProcessing = processingId === booking.id;
  const s = STATUS[booking.status] ?? STATUS.CANCELLED;

  const displayDate = booking.startTime ? booking.startTime.split('T')[0] : '—';
  const displayStartTime = booking.startTime ? booking.startTime.split('T')[1].substring(0, 5) : '—';
  const displayUser = booking.user?.id || booking.userId || 'System';

  return (
    <div className="group relative rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow hover:border-indigo-200 transition-all duration-200 overflow-hidden flex flex-col">
      <div className={`absolute left-0 top-0 h-full w-1 ${s.dot}`} />
      <div className="p-5 pl-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Request #{booking.id}</p>
            <p className="text-sm font-semibold text-slate-900 line-clamp-1" title={resourceName}>
              {resourceName || `Resource #${booking.resourceId}`}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">User ID</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800 truncate">{displayUser}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Schedule</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{displayDate}</p>
            <p className="text-xs text-slate-500">{displayStartTime}</p>
          </div>
        </div>

        {booking.purpose && (
          <div className="mb-4 flex-1">
            <p className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
              <span className="font-medium text-slate-400 mr-1">Purpose:</span> 
              {booking.purpose}
            </p>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
          {isPending && (
            <>
              <button onClick={() => onAction(booking, 'APPROVED')} disabled={isProcessing} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                {isProcessing ? '…' : 'Approve'}
              </button>
              <button onClick={() => onAction(booking, 'REJECTED')} disabled={isProcessing} className="flex-1 rounded-lg border border-red-200 bg-white py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50">
                {isProcessing ? '…' : 'Reject'}
              </button>
            </>
          )}
          {isApproved && (
            <button onClick={() => onAction(booking, 'CANCELLED')} disabled={isProcessing} className="flex-1 rounded-lg border border-amber-200 bg-white py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50">
              {isProcessing ? '…' : 'Cancel Booking'}
            </button>
          )}
          {isDead && (
            <button onClick={() => onAction(booking, 'DELETE')} disabled={isProcessing} className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/50">
              {isProcessing ? '…' : 'Delete Record'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * List component to display bookings grouped by date.
 */
function AgendaView({ bookings, resourceMap, onAction, processingId }) {
  const grouped = bookings.reduce((acc, b) => {
    const date = b.startTime ? b.startTime.split('T')[0] : 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(b);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  if (sortedDates.length === 0) return <EmptyState filter="ALL" />;

  return (
    <div className="space-y-6">
      {sortedDates.map(date => (
        <div key={date} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 text-sm">Date: {date}</h3>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
              {grouped[date].length} {grouped[date].length === 1 ? 'Booking' : 'Bookings'}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {grouped[date].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).map(b => {
              const resName = resourceMap[b.resourceId] || `Resource #${b.resourceId}`;
              const time = `${b.startTime.split('T')[1].substring(0,5)} - ${b.endTime.split('T')[1].substring(0,5)}`;
              
              return (
                <div key={b.id} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                  <div className="flex items-center gap-4">
                    <StatusBadge status={b.status} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{resName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">User: {b.user?.id || b.userId || 'System'} <span className="mx-1">•</span> {time}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {b.status === 'PENDING' && (
                      <>
                        <button onClick={() => onAction(b, 'APPROVED')} disabled={processingId === b.id} className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50">Approve</button>
                        <button onClick={() => onAction(b, 'REJECTED')} disabled={processingId === b.id} className="px-3.5 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">Reject</button>
                      </>
                    )}
                    {b.status === 'APPROVED' && (
                      <button onClick={() => onAction(b, 'CANCELLED')} disabled={processingId === b.id} className="px-3.5 py-1.5 text-xs font-semibold text-amber-600 bg-white border border-amber-200 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
                    )}
                    {(b.status === 'REJECTED' || b.status === 'CANCELLED') && (
                      <button onClick={() => onAction(b, 'DELETE')} disabled={processingId === b.id} className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50">Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Placeholder component rendered when no bookings match the current filters.
 */
function EmptyState({ filter }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center bg-white rounded-xl border border-slate-200 border-dashed">
      <div className="mb-4 text-4xl opacity-40">📋</div>
      <h3 className="text-base font-semibold text-slate-900">No bookings found</h3>
      <p className="mt-1.5 text-sm text-slate-500 max-w-sm">
        {filter === 'ALL' ? 'There are currently no booking requests in the system.' : `We couldn't find any ${filter.toLowerCase()} bookings matching your search criteria.`}
      </p>
    </div>
  );
}

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, logout, getApiErrorMessage } = useAuth();

  /* State Management */
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [resourceMap, setResourceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);
  
  /* Filter and View State */
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); 

  /* Modal State */
  const [modal, setModal] = useState({ open: false, booking: null, action: null });
  const [modalLoading, setModalLoading] = useState(false);

  /* Data Initialization */
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [bookingsData, resourcesData] = await Promise.all([
        getAllBookings({ size: 1000 }),
        getAllResources()
      ]);
      
      setBookings(bookingsData?.content || []);
      
      const resMap = {};
      if (Array.isArray(resourcesData)) {
        resourcesData.forEach(r => { resMap[r.id] = r.name; });
      }
      setResourceMap(resMap);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [getApiErrorMessage]);

  useEffect(() => { loadData(); }, [loadData]);

  /* Action Handlers */
  const handleAction = (booking, action) => {
    setModal({ open: true, booking, action });
  };

  const handleConfirm = async () => {
    setModalLoading(true);
    setProcessingId(modal.booking.id);
    try {
      if (modal.action === 'DELETE') {
        await deleteBooking(modal.booking.id);
      } else if (modal.action === 'CANCELLED') {
        await cancelBookingReq(modal.booking.id);
      } else {
        await updateBookingStatus(modal.booking.id, modal.action);
      }
      setModal({ open: false, booking: null, action: null });
      await loadData(); 
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setModal({ open: false, booking: null, action: null });
    } finally {
      setModalLoading(false);
      setProcessingId(null);
    }
  };

  const handleLogout = () => { 
    logout(); 
    navigate('/signin', { replace: true }); 
  };

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map(item => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role]
  );

  /* Advanced filtering combining Status and Text Search */
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const searchLower = searchQuery.toLowerCase();
      const dateStr = b.startTime ? b.startTime.split('T')[0] : '';
      const userIdStr = String(b.user?.id || b.userId || '').toLowerCase();
      const resNameStr = (resourceMap[b.resourceId] || '').toLowerCase(); 

      const matchSearch = !searchQuery || 
        String(b.id).includes(searchLower) || 
        userIdStr.includes(searchLower) || 
        resNameStr.includes(searchLower) || 
        dateStr.includes(searchLower);
        
      return matchStatus && matchSearch;
    });
  }, [bookings, statusFilter, searchQuery, resourceMap]);

  /* Aggregate calculation for status pills */
  const counts = useMemo(() => ({
    ALL:      bookings.length,
    PENDING:  bookings.filter(b => b.status === 'PENDING').length,
    APPROVED: bookings.filter(b => b.status === 'APPROVED').length,
    REJECTED: bookings.filter(b => b.status === 'REJECTED').length,
  }), [bookings]);

  const filters = [
    { key: 'ALL',      label: 'All',      colorClass: 'bg-indigo-600 border-indigo-600' },
    { key: 'PENDING',  label: 'Pending',  colorClass: 'bg-amber-500 border-amber-500' },
    { key: 'APPROVED', label: 'Approved', colorClass: 'bg-emerald-500 border-emerald-500' },
    { key: 'REJECTED', label: 'Rejected', colorClass: 'bg-red-500 border-red-500' },
    { key: 'CANCELLED',label: 'Cancelled',colorClass: 'bg-slate-500 border-slate-500' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
      `}</style>
      
      <ConfirmModal
        open={modal.open} action={modal.action} booking={modal.booking}
        resourceName={resourceMap[modal.booking?.resourceId]}
        onConfirm={handleConfirm} onCancel={() => setModal({ open: false, booking: null, action: null })}
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
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Admin Workspace" title="Booking Management" />

        <main className="mx-auto w-full max-w-6xl p-6 pb-24 space-y-6">

          {/* Validation & Error Messaging */}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-3 shadow-sm">
              <span className="text-lg">⚠️</span> 
              <span className="font-medium">{errorMessage}</span>
              <button onClick={() => setErrorMessage('')} className="ml-auto text-red-400 hover:text-red-600 focus:outline-none">✕</button>
            </div>
          )}

          {/* Page Header and Global Controls */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Facility Requests</h2>
              <p className="mt-1 text-sm text-slate-500 font-medium">
                {counts.PENDING > 0 ? `${counts.PENDING} pending request${counts.PENDING > 1 ? 's' : ''} awaiting your review.` : 'All requests are resolved.'}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Implementation */}
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                />
              </div>

              {/* View Toggles */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button onClick={() => setViewMode('cards')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Cards</button>
                <button onClick={() => setViewMode('agenda')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'agenda' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Agenda</button>
              </div>

              {/* Reload Data */}
              <button onClick={loadData} title="Refresh Data" className={`flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-indigo-600 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${loading ? 'opacity-60' : ''}`}>
                <span className={loading ? 'animate-spin inline-block' : ''}>↻</span>
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-indigo-600 border border-indigo-700 px-5 py-4 shadow-sm text-white flex flex-col justify-between">
               <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">Total Bookings</p>
               <p className="mt-2 text-3xl font-bold tabular-nums">{counts.ALL}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm flex flex-col justify-between">
               <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">Pending</p>
               <p className="mt-2 text-3xl font-bold tabular-nums text-slate-800">{counts.PENDING}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm flex flex-col justify-between">
               <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">Approved</p>
               <p className="mt-2 text-3xl font-bold tabular-nums text-slate-800">{counts.APPROVED}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm flex flex-col justify-between">
               <p className="text-[11px] font-semibold uppercase tracking-wider text-red-500">Rejected</p>
               <p className="mt-2 text-3xl font-bold tabular-nums text-slate-800">{counts.REJECTED}</p>
            </div>
          </div>

          {/* Interactive Filters */}
          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
              <FilterPill
                key={f.key}
                label={f.label}
                active={statusFilter === f.key}
                count={f.key === 'CANCELLED' ? filteredBookings.filter(b => b.status === 'CANCELLED').length : counts[f.key]}
                colorClass={f.colorClass}
                onClick={() => setStatusFilter(f.key)}
              />
            ))}
          </div>

          {/* Core Content Area */}
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 rounded-xl bg-slate-200" />)}
            </div>
          ) : (
            viewMode === 'cards' ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredBookings.length === 0 ? <EmptyState filter={statusFilter} /> : filteredBookings.map((booking) => (
                  <BookingCard 
                    key={booking.id} 
                    booking={booking} 
                    resourceName={resourceMap[booking.resourceId]} 
                    onAction={handleAction} 
                    processingId={processingId} 
                  />
                ))}
              </div>
            ) : (
              <AgendaView 
                bookings={filteredBookings} 
                resourceMap={resourceMap} 
                onAction={handleAction} 
                processingId={processingId} 
              />
            )
          )}
        </main>
      </div>
    </div>
  );
}