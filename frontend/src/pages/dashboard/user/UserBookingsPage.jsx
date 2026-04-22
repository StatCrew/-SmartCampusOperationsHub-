import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../../context/useAuth';
import { getSidebarItemsByRole } from '../constants';
import UserDashboardHeader from './components/UserDashboardHeader';
import UserSidebar from './components/UserSidebar';
import { getUserBookings, cancelBookingReq, deleteBooking } from '../../../api/bookingApi';
import { getAllResources } from '../../../api/resourceApi';
import QRCodeTicketModal from './components/QRCodeTicketModal';

/* Configuration for booking status badges */
const STATUS_CONFIG = {
  APPROVED:  { color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', dot: '#4f46e5', label: 'Approved'  },
  REJECTED:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', label: 'Rejected'  },
  CANCELLED: { color: '#4b5563', bg: '#f3f4f6', border: '#e5e7eb', dot: '#9ca3af', label: 'Cancelled' },
  PENDING:   { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'Pending'   },
};

const getStatus = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

/* Utility to parse and format ISO datetime strings */
const formatDateTime = (iso, part) => {
  if (!iso) return 'N/A';
  const [date, time] = iso.split('T');
  return part === 'date' ? date : (time || '').substring(0, 5);
};

/* Skeleton loader for asynchronous data fetching */
function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5].map(i => (
        <td key={i} style={{ padding: '1.25rem 1.5rem' }}>
          <div className="skeleton-box" style={{ width: i === 4 ? '60%' : i === 5 ? '40%' : '85%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function UserBookingsPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, role, logout, getApiErrorMessage } = useAuth();

  /* State Management */
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [resourceMap, setResourceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  /* Filter & Search State */
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);

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

  /* Advanced filtering logic encompassing status and search terms */
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
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Poppins', sans-serif", color: '#0f172a' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

        @keyframes shimmer { to { background-position: -200% 0 } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(15px) } to { opacity: 1; transform: none } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(10px) } to { opacity: 1; transform: none } }

        .fade-up { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.1s; }
        .fade-up-3 { animation-delay: 0.15s; }

        /* Core Typography */
        h1, h2, h3, p, span { font-family: 'Poppins', sans-serif; margin: 0; }

        /* Primary Indigo Action Button */
        .btn-primary {
          background: #4f46e5;
          color: #ffffff;
          border: none;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.65rem 1.5rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 4px rgba(79, 70, 229, 0.15);
        }
        .btn-primary:hover { background: #4338ca; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25); transform: translateY(-1px); }
        .btn-primary:active { transform: translateY(0); }

        /* Search Input */
        .search-input-wrapper { position: relative; width: 100%; max-width: 280px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.9rem; }
        .search-input {
          width: 100%;
          padding: 0.55rem 1rem 0.55rem 2.25rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-family: 'Poppins', sans-serif;
          font-size: 0.8125rem;
          color: #1e293b;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .search-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
        .search-input::placeholder { color: #94a3b8; }

        /* Toolbar Filter Pills */
        .filter-pill {
          font-family: 'Poppins', sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.4rem 1.1rem;
          border-radius: 100px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-pill:hover { border-color: #4f46e5; color: #4f46e5; }
        .filter-pill.active { background: #4f46e5; border-color: #4f46e5; color: #ffffff; box-shadow: 0 2px 6px rgba(79, 70, 229, 0.2); }

        /* Table & Row Styling */
        .booking-row { transition: background 0.15s ease; border-bottom: 1px solid #f1f5f9; }
        .booking-row:last-child { border-bottom: none; }
        .booking-row:hover { background: #f8fafc; }

        /* Inline Action Buttons */
        .action-btn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0.35rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          color: #475569;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .action-btn:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }
        .action-btn.cancel:hover:not(:disabled) { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .action-btn.ticket { color: #4f46e5; border-color: #c7d2fe; background: #eef2ff; }
        .action-btn.ticket:hover:not(:disabled) { background: #e0e7ff; border-color: #a5b4fc; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Skeleton Loaders */
        .skeleton-box {
          height: 16px;
          border-radius: 4px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        /* Modal Overlays */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(2px);
          z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem;
        }
        .modal-box {
          background: #ffffff;
          padding: 2rem;
          border-radius: 12px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          animation: modalIn 0.2s ease-out;
        }
        .modal-icon-container { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; margin-bottom: 1.25rem; }

        /* Error Banners */
        .error-banner {
          border-radius: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 0.875rem 1.25rem;
          font-size: 0.875rem;
          color: #b91c1c;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>

      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={item => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div style={{ minHeight: '100vh', transition: 'padding-left 0.3s', paddingLeft: isSidebarExpanded ? 256 : 80 }}>
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Student Dashboard" title="My Bookings" />

        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

          {errorMessage && (
            <div className="error-banner">
              <span>⚠️</span> {errorMessage}
            </div>
          )}

          {/* Page Header Area */}
          <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>My Reservations</h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>View and manage your facility requests.</p>
            </div>
            <button className="btn-primary" onClick={() => navigate('/dashboard/user/resources')}>
              <span>＋</span> Request Room
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <StatCard label="Total Bookings" value={stats.total} accent="#4f46e5" isPrimary loading={loading} />
            <StatCard label="Approved" value={stats.approved} loading={loading} color="#4f46e5" />
            <StatCard label="Pending" value={stats.pending} loading={loading} color="#d97706" />
            <StatCard label="Rejected" value={stats.rejected} loading={loading} color="#dc2626" />
          </div>

          {/* Main Data Table Card */}
          <div className="fade-up fade-up-2" style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            
            {/* Toolbar: Search & Filters */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: '#fdfcff' }}>
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search resources, dates, IDs..." 
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(s => (
                  <button
                    key={s}
                    className={`filter-pill ${filterStatus === s ? 'active' : ''}`}
                    onClick={() => setFilterStatus(s)}
                  >
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Content */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    {['Resource Details', 'Date', 'Time Frame', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '0.875rem 1.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textAlign: h === 'Actions' ? 'right' : 'left'
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                          <span style={{ fontSize: '2.5rem', opacity: 0.3 }}>📭</span>
                          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: '1rem 0 0.25rem' }}>
                            {searchQuery ? 'No matching results' : filterStatus === 'ALL' ? 'No bookings found' : `No ${filterStatus.toLowerCase()} bookings`}
                          </p>
                          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {searchQuery ? 'Try adjusting your search criteria.' : 'Your requested facility reservations will appear here.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map(booking => {
                      const st = getStatus(booking.status);
                      const canCancel = booking.status === 'PENDING' || booking.status === 'APPROVED';
                      const canDelete = booking.status === 'CANCELLED' || booking.status === 'REJECTED';
                      const resName = resourceMap[booking.resourceId] || `Resource #${booking.resourceId}`;

                      return (
                        <tr key={booking.id} className="booking-row" onMouseEnter={() => setHoveredRow(booking.id)} onMouseLeave={() => setHoveredRow(null)}>
                          
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                                🏢
                              </div>
                              <div>
                                <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{resName}</p>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                                  {booking.purpose ? booking.purpose.substring(0, 36) + (booking.purpose.length > 36 ? '…' : '') : 'No purpose specified'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{ fontWeight: 500, color: '#334155', fontSize: '0.875rem' }}>
                              {formatDateTime(booking.startTime, 'date')}
                            </span>
                          </td>

                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.25rem 0.5rem' }}>
                              <span style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 500 }}>{formatDateTime(booking.startTime, 'time')}</span>
                              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>→</span>
                              <span style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 500 }}>{formatDateTime(booking.endTime, 'time')}</span>
                            </div>
                          </td>

                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                              background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                              borderRadius: 100, padding: '0.25rem 0.75rem',
                              fontSize: '0.75rem', fontWeight: 600,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
                              {st.label}
                            </span>
                          </td>

                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              {booking.status === 'APPROVED' && (
                                <button className="action-btn ticket" onClick={() => setTicketTarget(booking)} title="View Entry Ticket">
                                  <span>🎟️</span> Ticket
                                </button>
                              )}
                              {canCancel && (
                                <>
                                  <button className="action-btn" onClick={() => navigate(`/dashboard/user/resources/${booking.resourceId}`, { state: { modifyBooking: booking } })}>
                                    Modify
                                  </button>
                                  <button className="action-btn cancel" onClick={() => setCancelTarget(booking.id)}>
                                    Cancel
                                  </button>
                                </>
                              )}
                              {canDelete && (
                                <button className="action-btn cancel" onClick={() => setDeleteTarget(booking.id)}>
                                  Delete
                                </button>
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

      {/* Cancellation Confirmation Modal */}
      {cancelTarget && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-icon-container" style={{ background: '#fef2f2', color: '#dc2626' }}>⚠️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Cancel Reservation?</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to cancel this booking? This action cannot be undone and will release the time slot back to the public.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCancelTarget(null)}
                disabled={isCancelling}
                className="action-btn"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="btn-primary"
                style={{ background: '#dc2626', padding: '0.5rem 1rem', fontSize: '0.875rem', boxShadow: 'none' }}
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-icon-container" style={{ background: '#fef2f2', color: '#dc2626' }}>🗑️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Delete Record?</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to permanently delete this record from your history? <strong>This cannot be undone.</strong>
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="action-btn"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                Go Back
              </button>
              <button
                onClick={handleDeleteBooking}
                disabled={isDeleting}
                className="btn-primary"
                style={{ background: '#dc2626', padding: '0.5rem 1rem', fontSize: '0.875rem', boxShadow: 'none' }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <QRCodeTicketModal
        isOpen={!!ticketTarget}
        booking={ticketTarget}
        onClose={() => setTicketTarget(null)}
      />
    </div>
  );
}

/* Reusable Statistic Card Component */
function StatCard({ label, value, isPrimary, loading, color }) {
  return (
    <div style={{
      background: isPrimary ? '#4f46e5' : '#ffffff',
      borderRadius: 12,
      padding: '1.25rem',
      border: isPrimary ? 'none' : '1px solid #e2e8f0',
      boxShadow: isPrimary ? '0 4px 12px rgba(79, 70, 229, 0.2)' : '0 1px 3px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: isPrimary ? '#e0e7ff' : '#64748b' }}>
          {label}
        </span>
        {!isPrimary && color && (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        )}
      </div>

      {loading ? (
        <div style={{ height: 32, width: 48, borderRadius: 6, background: isPrimary ? 'rgba(255,255,255,0.2)' : '#f1f5f9', animation: 'shimmer 1.5s infinite' }} />
      ) : (
        <span style={{ fontSize: '2rem', fontWeight: 600, color: isPrimary ? '#ffffff' : '#0f172a', lineHeight: 1 }}>
          {value}
        </span>
      )}
    </div>
  );
}