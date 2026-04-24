import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../../context/useAuth';
import { getSidebarItemsByRole } from '../constants';
import UserDashboardHeader from './components/UserDashboardHeader';
import UserSidebar from './components/UserSidebar';
import { getUserBookings, cancelBookingReq, deleteBooking } from '../../../api/bookingApi';
import { getAllResources } from '../../../api/resourceApi';
import QRCodeTicketModal from './components/QRCodeTicketModal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

/* Utility to parse and format ISO datetime strings */
const formatDateTime = (iso, part) => {
  if (!iso) return 'N/A';
  const [date, time] = iso.split('T');
  return part === 'date' ? date : (time || '').substring(0, 5);
};

/* Skeleton loader for asynchronous data fetching */
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-slate-200" /></td>
      <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-slate-200" /></td>
      <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-slate-200" /></td>
      <td className="px-6 py-4"><div className="h-4 w-16 rounded bg-slate-200" /></td>
      <td className="px-6 py-4"><div className="ml-auto h-4 w-24 rounded bg-slate-200" /></td>
    </tr>
  );
}

export default function UserBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, logout, getApiErrorMessage } = useAuth();

  /* State Management */
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [resourceMap, setResourceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  /* Filter & Search State */
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  /* Modal States */
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [ticketTarget, setTicketTarget] = useState(null);

  /* Data Initialization */
  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setErrorMessage('');
    
    try {
      const [bookingsData, resourcesData] = await Promise.all([
        getUserBookings(user.id),
        getAllResources().catch(() => [])
      ]);

      const sortedBookings = (bookingsData?.content || bookingsData || [])
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      
      setBookings(sortedBookings);

      const mappedResources = {};
      if (Array.isArray(resourcesData)) {
        resourcesData.forEach(r => { mappedResources[r.id] = r.name; });
      }
      setResourceMap(mappedResources);

    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [user?.id, getApiErrorMessage]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const handleLogout = () => {
    logout();
    navigate('/signin', { replace: true });
  };

  const sidebarItems = useMemo(() => 
    getSidebarItemsByRole(role).map(item => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role]
  );

  /* Advanced filtering logic */
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesStatus = filterStatus === 'ALL' || b.status === filterStatus;
      const searchLower = searchQuery.toLowerCase();
      const resourceName = (resourceMap[b.resourceId] || `Resource #${b.resourceId}`).toLowerCase();
      const purpose = (b.purpose || '').toLowerCase();
      const dateString = (b.startTime || '').toLowerCase();

      const matchesSearch = !searchQuery || 
        resourceName.includes(searchLower) || 
        purpose.includes(searchLower) || 
        dateString.includes(searchLower) ||
        String(b.id).includes(searchLower);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, filterStatus, searchQuery, resourceMap]);

  /* Aggregate statistics calculation */
  const stats = useMemo(() => ({
    total: bookings.length,
    approved: bookings.filter(b => b.status === 'APPROVED').length,
    pending: bookings.filter(b => b.status === 'PENDING').length,
    rejected: bookings.filter(b => b.status === 'REJECTED').length,
  }), [bookings]);

  /* Action Handlers */
  const handleCancelBooking = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await cancelBookingReq(cancelTarget);
      setBookings(prev => prev.map(b => b.id === cancelTarget ? { ...b, status: 'CANCELLED' } : b));
      setCancelTarget(null);
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBooking(deleteTarget);
      setBookings(prev => prev.filter(b => b.id !== deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={item => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader 
          onLogout={handleLogout} 
          eyebrow="Student Dashboard" 
          title="My Bookings" 
          onToggleSidebar={() => setIsSidebarExpanded(prev => !prev)}
        />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
          {errorMessage && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {errorMessage}
            </div>
          )}

          {/* Page Header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">My Reservations</h2>
              <p className="mt-1 text-sm text-slate-500 text-slate-600">View and manage your facility requests.</p>
            </div>
            <Button variant="primary" onClick={() => navigate('/dashboard/user/resources')} className="rounded-xl px-6">
              <span className="material-symbols-outlined mr-2">add</span> Book Resource
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Bookings" value={stats.total} isPrimary loading={loading} />
            <StatCard label="Approved" value={stats.approved} loading={loading} color="bg-indigo-600" />
            <StatCard label="Pending" value={stats.pending} loading={loading} color="bg-amber-500" />
            <StatCard label="Rejected" value={stats.rejected} loading={loading} color="bg-rose-500" />
          </div>

          {/* Toolbar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
            <div className="relative w-full max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                type="text" 
                placeholder="Search resources, dates..." 
                className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(s => (
                <button
                  key={s}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    filterStatus === s 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    {['Resource Details', 'Date', 'Time Frame', 'Status', 'Actions'].map(h => (
                      <th key={h} className={`px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${h === 'Actions' ? 'text-right' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl text-slate-200">inbox</span>
                          <div>
                            <p className="text-lg font-bold text-slate-900">
                              {searchQuery ? 'No matching results' : 'No bookings found'}
                            </p>
                            <p className="text-sm text-slate-500">
                              {searchQuery ? 'Try adjusting your search filters.' : 'Your requested reservations will appear here.'}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map(booking => {
                      const canCancel = booking.status === 'PENDING' || booking.status === 'APPROVED';
                      const canModify = booking.status === 'PENDING';
                      const canDelete = booking.status === 'CANCELLED' || booking.status === 'REJECTED';
                      const resName = resourceMap[booking.resourceId] || `Resource #${booking.resourceId}`;

                      return (
                        <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                <span className="material-symbols-outlined">domain</span>
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{resName}</p>
                                <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                  {booking.purpose || 'No purpose specified'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">
                            {formatDateTime(booking.startTime, 'date')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                              <span>{formatDateTime(booking.startTime, 'time')}</span>
                              <span className="text-slate-300">→</span>
                              <span>{formatDateTime(booking.endTime, 'time')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={booking.status === 'APPROVED' ? 'success' : booking.status === 'PENDING' ? 'warning' : 'neutral'}>
                              {booking.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {canModify && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/dashboard/user/resources/${booking.resourceId}`, {
                                    state: { modifyBooking: booking }
                                  })}
                                  className="text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                                >
                                  <span className="material-symbols-outlined mr-1 text-[18px]">edit_calendar</span> Modify
                                </Button>
                              )}
                              {booking.status === 'APPROVED' && (
                                <Button size="sm" variant="outline" onClick={() => setTicketTarget(booking)} className="text-indigo-600 border-indigo-100 hover:bg-indigo-50">
                                  <span className="material-symbols-outlined mr-1 text-[18px]">confirmation_number</span> Ticket
                                </Button>
                              )}
                              {canCancel && (
                                <Button size="sm" variant="danger" onClick={() => setCancelTarget(booking.id)} className="px-3">
                                  Cancel
                                </Button>
                              )}
                              {canDelete && (
                                <Button size="sm" variant="danger" onClick={() => setDeleteTarget(booking.id)} className="px-3">
                                  Delete
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {cancelTarget && (
        <Modal 
          icon="warning" 
          iconBg="bg-rose-100" 
          iconColor="text-rose-600"
          title="Cancel Reservation?"
          description="Are you sure you want to cancel this booking? This action will release the time slot back to the public."
          confirmText="Yes, Cancel"
          isProcessing={isCancelling}
          onConfirm={handleCancelBooking}
          onCancel={() => setCancelTarget(null)}
        />
      )}

      {deleteTarget && (
        <Modal 
          icon="delete" 
          iconBg="bg-slate-100" 
          iconColor="text-slate-600"
          title="Delete Record?"
          description="Permanently remove this record from your history? This action cannot be undone."
          confirmText="Yes, Delete"
          isProcessing={isDeleting}
          onConfirm={handleDeleteBooking}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <QRCodeTicketModal
        isOpen={!!ticketTarget}
        booking={ticketTarget}
        onClose={() => setTicketTarget(null)}
      />
    </div>
  );
}

function StatCard({ label, value, isPrimary, loading, color }) {
  return (
    <div className={`rounded-2xl p-5 transition-all ${isPrimary ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-100 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${isPrimary ? 'text-indigo-100' : 'text-slate-400'}`}>{label}</span>
        {!isPrimary && <div className={`h-2 w-2 rounded-full ${color}`} />}
      </div>
      {loading ? (
        <div className={`h-8 w-12 rounded-lg animate-pulse ${isPrimary ? 'bg-indigo-500' : 'bg-slate-100'}`} />
      ) : (
        <p className="text-3xl font-black">{value}</p>
      )}
    </div>
  );
}

function Modal({ icon, iconBg, iconColor, title, description, confirmText, isProcessing, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">{description}</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel} disabled={isProcessing}>Keep it</Button>
          <Button variant="danger" className="flex-1 rounded-xl" onClick={onConfirm} disabled={isProcessing}>
            {isProcessing ? 'Wait...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
