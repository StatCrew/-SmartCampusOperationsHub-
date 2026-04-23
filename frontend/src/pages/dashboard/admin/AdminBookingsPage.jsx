import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAllBookings, updateBookingStatus, cancelBookingReq, deleteBooking } from '../../../api/bookingApi';
import { getAllResources } from '../../../api/resourceApi';
import { sendAdminTestNotification } from '../../../api/adminApi';
import useAuth from '../../../context/useAuth';
import { getSidebarItemsByRole } from '../constants';
import UserDashboardHeader from '../user/components/UserDashboardHeader';
import UserSidebar from '../user/components/UserSidebar';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

/**
 * Configuration object defining the visual properties for booking statuses.
 */
const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   variant: 'neutral', icon: 'pending' },
  APPROVED:  { label: 'Approved',  variant: 'success', icon: 'check_circle' },
  REJECTED:  { label: 'Rejected',  variant: 'danger',  icon: 'cancel' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral', icon: 'block' },
};

/**
 * Renders a stylized badge indicating the current status of a booking.
 */
function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.CANCELLED;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <span className="material-symbols-outlined text-[14px]">{config.icon}</span>
      {config.label}
    </Badge>
  );
}

/**
 * Interactive pill component used for filtering the bookings list.
 */
function FilterPill({ label, active, onClick, count, activeClass }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border transition-all duration-200 ${
        active
          ? `${activeClass || 'bg-indigo-600 border-indigo-600'} text-white shadow-md scale-105`
          : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-slate-50'
      }`}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
        {count}
      </span>
    </button>
  );
}

/**
 * Modal dialogue for confirming administrative actions.
 */
function ConfirmModal({ open, action, booking, resourceName, onConfirm, onCancel, loading }) {
  if (!open) return null;

  let title, desc, btnVariant, btnText, icon, iconColor;
  
  switch (action) {
    case 'APPROVED':
      title = 'Approve Booking?'; desc = 'Confirm this reservation and notify the user.'; btnVariant = 'primary'; btnText = 'Yes, Approve'; icon = 'check_circle'; iconColor = 'text-emerald-500';
      break;
    case 'REJECTED':
      title = 'Reject Booking?'; desc = 'Decline this request. The user will be notified.'; btnVariant = 'danger'; btnText = 'Yes, Reject'; icon = 'cancel'; iconColor = 'text-rose-500';
      break;
    case 'CANCELLED':
      title = 'Cancel Booking?'; desc = 'Revoke this approved booking and free up the timeslot.'; btnVariant = 'outline'; btnText = 'Yes, Cancel'; icon = 'warning'; iconColor = 'text-amber-500';
      break;
    case 'DELETE':
      title = 'Permanently Delete?'; desc = 'Completely erase this record. This action is irreversible.'; btnVariant = 'danger'; btnText = 'Yes, Delete'; icon = 'delete_forever'; iconColor = 'text-slate-600';
      break;
    default:
      return null;
  }

  const displayDate = booking?.startTime ? booking.startTime.split('T')[0] : '—';
  const displayTime = booking?.startTime ? `${booking.startTime.split('T')[1].substring(0, 5)} - ${booking.endTime.split('T')[1].substring(0, 5)}` : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-8 transform transition-all animate-in zoom-in-95 duration-200">
        <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ${iconColor}`}>
          <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
        
        {booking && (
          <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Booking Ref</span> <span className="font-mono font-bold text-slate-900">#{booking.id}</span></div>
            <div className="flex justify-between items-center"><span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Resource</span> <span className="font-bold text-indigo-600">{resourceName || `#${booking.resourceId}`}</span></div>
            <div className="flex justify-between items-center"><span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Schedule</span> <span className="font-semibold text-slate-700">{displayDate} at {displayTime}</span></div>
          </div>
        )}
        
        <div className="mt-8 flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant={btnVariant} onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? 'Processing...' : btnText}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Card component to display individual booking requests.
 */
function BookingCard({ booking, resourceName, onAction, processingId }) {
  const isPending = booking.status === 'PENDING';
  const isApproved = booking.status === 'APPROVED';
  const isDead = booking.status === 'REJECTED' || booking.status === 'CANCELLED';
  const isProcessing = processingId === booking.id;

  const displayDate = booking.startTime ? booking.startTime.split('T')[0] : '—';
  const displayStartTime = booking.startTime ? booking.startTime.split('T')[1].substring(0, 5) : '—';
  const displayUser = booking.user?.id || booking.userId || 'System';

  return (
    <div className="group relative rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all duration-300 overflow-hidden flex flex-col">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">ID: {booking.id}</p>
            <h4 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
              {resourceName || `Resource #${booking.resourceId}`}
            </h4>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Requestor</p>
            <p className="text-xs font-bold text-slate-700 truncate">{displayUser}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Schedule</p>
            <p className="text-xs font-bold text-slate-700">{displayDate}</p>
            <p className="text-[10px] font-medium text-slate-500 mt-0.5">{displayStartTime}</p>
          </div>
        </div>

        {booking.purpose && (
          <div className="mb-6 flex-1">
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "{booking.purpose}"
            </p>
          </div>
        )}

        <div className="mt-auto pt-5 border-t border-slate-50 flex gap-2">
          {isPending && (
            <>
              <Button onClick={() => onAction(booking, 'APPROVED')} disabled={isProcessing} className="flex-1" size="sm">
                {isProcessing ? '...' : 'Approve'}
              </Button>
              <Button onClick={() => onAction(booking, 'REJECTED')} disabled={isProcessing} variant="danger" className="flex-1" size="sm">
                {isProcessing ? '...' : 'Reject'}
              </Button>
            </>
          )}
          {isApproved && (
            <Button onClick={() => onAction(booking, 'CANCELLED')} disabled={isProcessing} variant="outline" className="flex-1 text-amber-600 border-amber-200 hover:bg-amber-50" size="sm">
              {isProcessing ? '...' : 'Cancel'}
            </Button>
          )}
          {isDead && (
            <Button onClick={() => onAction(booking, 'DELETE')} disabled={isProcessing} variant="outline" className="flex-1" size="sm">
              {isProcessing ? '...' : 'Delete'}
            </Button>
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

  const sortedDates = Object.keys(grouped).sort().reverse();

  if (sortedDates.length === 0) return <EmptyState filter="ALL" />;

  return (
    <div className="space-y-8">
      {sortedDates.map(date => (
        <div key={date} className="group">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px flex-1 bg-slate-200" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 bg-white px-3">{date}</h3>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {grouped[date].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).map(b => {
              const resName = resourceMap[b.resourceId] || `Resource #${b.resourceId}`;
              const time = `${b.startTime.split('T')[1].substring(0,5)} - ${b.endTime.split('T')[1].substring(0,5)}`;
              
              return (
                <div key={b.id} className="p-5 hover:bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
                  <div className="flex items-center gap-5">
                    <StatusBadge status={b.status} />
                    <div>
                      <p className="text-sm font-bold text-slate-900 tracking-tight">{resName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">person</span> {b.user?.id || b.userId || 'System'}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span> {time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {b.status === 'PENDING' && (
                      <>
                        <Button onClick={() => onAction(b, 'APPROVED')} disabled={processingId === b.id} size="sm">Approve</Button>
                        <Button onClick={() => onAction(b, 'REJECTED')} disabled={processingId === b.id} variant="danger" size="sm">Reject</Button>
                      </>
                    )}
                    {b.status === 'APPROVED' && (
                      <Button onClick={() => onAction(b, 'CANCELLED')} disabled={processingId === b.id} variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" size="sm">Cancel</Button>
                    )}
                    {(b.status === 'REJECTED' || b.status === 'CANCELLED') && (
                      <Button onClick={() => onAction(b, 'DELETE')} disabled={processingId === b.id} variant="outline" size="sm">Delete</Button>
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
    <div className="col-span-full flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-dashed border-slate-300">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
        <span className="material-symbols-outlined text-5xl">event_busy</span>
      </div>
      <h3 className="text-xl font-black text-slate-900">No Reservations Found</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-sm font-medium">
        {filter === 'ALL' ? 'The facility booking system is currently clear of any requests.' : `We couldn't find any ${filter.toLowerCase()} bookings matching your current view.`}
      </p>
    </div>
  );
}

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, logout, getApiErrorMessage } = useAuth();

  /* State Management */
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
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
        
        // Send notification to the user about the status change
        const targetUserId = modal.booking.userId || modal.booking.user?.id;
        if (targetUserId) {
          try {
            const resourceName = resourceMap[modal.booking.resourceId] || 'Resource';
            const datePart = modal.booking.startTime ? String(modal.booking.startTime).split('T')[0] : 'Scheduled Date';
            
            await sendAdminTestNotification({
              recipientUserId: targetUserId,
              title: `Booking ${modal.action === 'APPROVED' ? 'Approved' : 'Rejected'}`,
              message: `Your booking for ${resourceName} on ${datePart} has been ${modal.action.toLowerCase()}.`,
              actionUrl: '/dashboard/user/bookings',
              category: 'BOOKING'
            });
          } catch (notiError) {
            console.error('Failed to send notification:', notiError);
          }
        }
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

  /* Advanced filtering */
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const dateStr = b.startTime ? b.startTime.split('T')[0] : '';
      const userIdStr = String(b.user?.id || b.userId || '').toLowerCase();
      const resNameStr = (resourceMap[b.resourceId] || '').toLowerCase(); 

      const matchSearch = !q || 
        String(b.id).includes(q) || 
        userIdStr.includes(q) || 
        resNameStr.includes(q) || 
        dateStr.includes(q);
        
      return matchStatus && matchSearch;
    });
  }, [bookings, statusFilter, searchQuery, resourceMap]);

  /* Aggregate calculation */
  const counts = useMemo(() => ({
    ALL:      bookings.length,
    PENDING:  bookings.filter(b => b.status === 'PENDING').length,
    APPROVED: bookings.filter(b => b.status === 'APPROVED').length,
    REJECTED: bookings.filter(b => b.status === 'REJECTED').length,
    CANCELLED: bookings.filter(b => b.status === 'CANCELLED').length,
  }), [bookings]);

  const filters = [
    { key: 'ALL',      label: 'All Requests', activeClass: 'bg-indigo-600 border-indigo-600' },
    { key: 'PENDING',  label: 'Pending',      activeClass: 'bg-amber-500 border-amber-500' },
    { key: 'APPROVED', label: 'Approved',     activeClass: 'bg-emerald-500 border-emerald-500' },
    { key: 'REJECTED', label: 'Rejected',     activeClass: 'bg-rose-500 border-rose-500' },
    { key: 'CANCELLED',label: 'Cancelled',    activeClass: 'bg-slate-500 border-slate-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <ConfirmModal
        open={modal.open} 
        action={modal.action} 
        booking={modal.booking}
        resourceName={resourceMap[modal.booking?.resourceId]}
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
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Campus Operations" title="Facility Bookings" />

        <main className="mx-auto w-full max-w-6xl p-4 md:p-8 pb-32 space-y-8">
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
              <span className="material-symbols-outlined text-rose-500">error</span> 
              <span className="font-bold">{errorMessage}</span>
              <button onClick={() => setErrorMessage('')} className="ml-auto text-rose-400 hover:text-rose-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          )}

          {/* Hero Section */}
          <section className="mb-8 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight leading-none mb-3">Booking Pipeline</h2>
                <p className="text-indigo-100/70 text-sm font-medium max-w-sm">
                  Coordinate facility usage across the campus. {counts.PENDING} requests require your immediate attention.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={loadData} 
                  disabled={loading}
                  className="bg-indigo-500/20 text-white border border-indigo-400/30 hover:bg-indigo-500/40 shadow-lg shadow-indigo-500/10 backdrop-blur-sm"
                >
                  <span className={`material-symbols-outlined mr-2 ${loading ? 'animate-spin' : ''}`}>refresh</span> Sync Schedule
                </Button>
              </div>
            </div>
          </section>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </span>
              <input
                type="text"
                placeholder="Filter by user or facility..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full sm:w-72 rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-5 text-sm font-medium text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                <button onClick={() => setViewMode('cards')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-600'}`}>Cards</button>
                <button onClick={() => setViewMode('agenda')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'agenda' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-600'}`}>Agenda</button>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {filters.map(f => (
              <FilterPill
                key={f.key}
                label={f.label}
                active={statusFilter === f.key}
                count={counts[f.key]}
                activeClass={f.activeClass}
                onClick={() => setStatusFilter(f.key)}
              />
            ))}
          </div>

          {/* Grid/List Content */}
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 rounded-3xl bg-white border border-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              {viewMode === 'cards' ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBookings.length === 0 ? (
                    <EmptyState filter={statusFilter} />
                  ) : (
                    filteredBookings.map((booking) => (
                      <BookingCard 
                        key={booking.id} 
                        booking={booking} 
                        resourceName={resourceMap[booking.resourceId]} 
                        onAction={handleAction} 
                        processingId={processingId} 
                      />
                    ))
                  )}
                </div>
              ) : (
                <AgendaView 
                  bookings={filteredBookings} 
                  resourceMap={resourceMap} 
                  onAction={handleAction} 
                  processingId={processingId} 
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}