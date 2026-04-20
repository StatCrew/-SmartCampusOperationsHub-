import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getUserBookings } from '../../../api/bookingApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'
import CreateBookingModal from './components/CreateBookingModal'

// ── Status config (UPDATED TO MATCH LOGO COLORS) ───────────────
const STATUS_CONFIG = {
  APPROVED:  { color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)',  border: 'rgba(14, 165, 233, 0.25)', dot: '#0ea5e9',  label: 'Approved'  },
  REJECTED:  { color: '#e53e3e', bg: 'rgba(229,62,62,0.08)',  border: 'rgba(229,62,62,0.2)',   dot: '#e53e3e',  label: 'Rejected'  },
  CANCELLED: { color: '#718096', bg: 'rgba(113,128,150,0.08)', border: 'rgba(113,128,150,0.2)', dot: '#718096', label: 'Cancelled' },
  PENDING:   { color: '#d97706', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.2)',   dot: '#d97706',  label: 'Pending'   },
}

const getStatus = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.PENDING

const fmt = (iso, part) => {
  if (!iso) return 'N/A'
  const [date, time] = iso.split('T')
  return part === 'date' ? date : (time || '').substring(0, 5)
}

function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4].map(i => (
        <td key={i} className="px-6 py-4">
          <div style={{ height: 14, borderRadius: 7, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', width: i === 3 ? '60%' : '85%' }} />
        </td>
      ))}
    </tr>
  )
}

export default function UserBookingsPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, role, logout, getApiErrorMessage } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [bookings,      setBookings]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [errorMessage,  setErrorMessage]  = useState('')
  const [isModalOpen,   setIsModalOpen]   = useState(false)
  const [filterStatus,  setFilterStatus]  = useState('ALL')
  const [hoveredRow,    setHoveredRow]    = useState(null)

  // State for the Cancellation Confirm Dialog
  const [cancelTarget, setCancelTarget] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const loadBookings = useCallback(async () => {
    if (!user?.id) return
    setLoading(true); setErrorMessage('')
    try {
      const data = await getUserBookings(user.id)
      // Sort bookings so newest are at the top
      const sortedData = (data?.content || data || []).sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      setBookings(sortedData)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [user?.id, getApiErrorMessage])

  useEffect(() => { loadBookings() }, [loadBookings])

  const handleLogout = () => { logout(); navigate('/signin', { replace: true }) }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map(item => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role]
  )

  const filtered = filterStatus === 'ALL' ? bookings : bookings.filter(b => b.status === filterStatus)

  const stats = useMemo(() => ({
    total:    bookings.length,
    approved: bookings.filter(b => b.status === 'APPROVED').length,
    pending:  bookings.filter(b => b.status === 'PENDING').length,
    rejected: bookings.filter(b => b.status === 'REJECTED').length,
  }), [bookings])

  // 👇 NEW LOGIC: Handle Cancellation
  const handleCancelBooking = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      // NOTE: You must build this specific PATCH endpoint in your Spring Boot Backend!
      // Example: fetch(`/api/v1/bookings/${cancelTarget}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
      
      // Simulating a successful cancellation for the UI:
      setTimeout(() => {
        setBookings(prev => prev.map(b => b.id === cancelTarget ? { ...b, status: 'CANCELLED' } : b))
        setCancelTarget(null);
        setIsCancelling(false);
      }, 800)

    } catch (err) {
      setErrorMessage(getApiErrorMessage(err))
      setIsCancelling(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif", color: '#0f172a' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @keyframes shimmer { to { background-position: -200% 0 } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:none } }

        .page-fade { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) both }
        .stat-card { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) both }
        .stat-card:nth-child(1) { animation-delay: 0.05s }
        .stat-card:nth-child(2) { animation-delay: 0.1s  }
        .stat-card:nth-child(3) { animation-delay: 0.15s }
        .stat-card:nth-child(4) { animation-delay: 0.2s  }

        /* Re-styled to match SmartCampus Blues */
        .request-btn {
          background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
          color: #fff; border: none; cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem; font-weight: 600;
          padding: 0.65rem 1.35rem; border-radius: 8px;
          box-shadow: 0 4px 12px rgba(33, 147, 176, 0.3);
          transition: all 0.2s;
          display: flex; align-items: center; gap: 0.4rem; white-space: nowrap;
        }
        .request-btn:hover { filter: brightness(1.05); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(33, 147, 176, 0.4); }
        .request-btn:active { transform: translateY(0) }

        .filter-chip {
          font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 600;
          padding: 0.4rem 1rem; border-radius: 100px; border: 1px solid #cbd5e1;
          background: #fff; color: #475569; cursor: pointer;
          transition: all 0.2s;
        }
        .filter-chip:hover   { border-color: #2193b0; color: #2193b0; background: #f0f9ff; }
        .filter-chip.active  {
          background: #2193b0;
          border-color: #2193b0; color: #fff;
          box-shadow: 0 2px 8px rgba(33,147,176,0.3);
        }

        .booking-row { transition: background 0.12s }
        .booking-row:hover { background: #f8fafc }

        .empty-state { text-align:center; padding: 4rem 2rem }

        .error-banner {
          border-radius: 8px; background: #fef2f2; border: 1px solid rgba(229,62,62,0.2);
          padding: 0.75rem 1rem; font-size: 0.875rem; color: #c53030;
          margin-bottom: 1.5rem; display:flex; align-items:center; gap:0.5rem;
        }

        /* Action Buttons */
        .action-btn { background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.35rem 0.75rem; font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: all 0.2s; color: #475569; }
        .action-btn:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
        .action-btn.cancel:hover:not(:disabled) { background: #fef2f2; color: #dc2626; border-color: #fca5a5; }
        .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Cancel Modal */
        .cancel-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(2px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .cancel-box { background: white; padding: 2rem; border-radius: 12px; max-width: 400px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); animation: modalIn 0.2s ease-out; }
      `}</style>

      <UserSidebar isSidebarExpanded={isSidebarExpanded} onCollapse={() => setIsSidebarExpanded(false)} onExpand={() => setIsSidebarExpanded(true)} onItemNavigate={item => item.path && navigate(item.path)} onLogout={handleLogout} sidebarItems={sidebarItems} />

      <div style={{ minHeight: '100vh', transition: 'padding-left 0.3s', paddingLeft: isSidebarExpanded ? 256 : 80 }}>
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Student" title="My Bookings" />

        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

          {errorMessage && <div className="error-banner"><span>⚠️</span> {errorMessage}</div>}

          {/* ── Page title + CTA ── */}
          <div className="page-fade" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#2193b0', margin: '0 0 0.35rem' }}>
                Campus Facilities
              </p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                My Reservations
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.35rem' }}>
                View and manage your campus facility bookings.
              </p>
            </div>
            <button className="request-btn" onClick={() => setIsModalOpen(true)}>
              <span style={{ fontSize: '1rem' }}>＋</span> Request Room
            </button>
          </div>

          {/* ── Stat Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            <StatCard label="Total Bookings" value={stats.total}    color="#2193b0" bg="linear-gradient(135deg, #2193b0, #6dd5ed)" icon="📋" loading={loading} />
            <StatCard label="Approved"       value={stats.approved} color="#0ea5e9" bg="#f0f9ff" textColor="#0369a1" icon="✅" loading={loading} />
            <StatCard label="Pending"        value={stats.pending}  color="#d97706" bg="#fffbeb" textColor="#92400e" icon="⏳" loading={loading} />
            <StatCard label="Rejected"       value={stats.rejected} color="#e53e3e" bg="#fef2f2" textColor="#c53030" icon="✗"  loading={loading} />
          </div>

          {/* ── Table Card ── */}
          <div className="page-fade" style={{ animationDelay: '0.25s', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>

            {/* Table header bar */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: '#f8fafc' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                {filtered.length} {filtered.length === 1 ? 'Booking' : 'Bookings'} {filterStatus !== 'ALL' && `(${filterStatus.toLowerCase()})`}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(s => (
                  <button key={s} className={`filter-chip ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                    {['Resource', 'Date', 'Time', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1.5rem', textAlign: h==='Actions'?'right':'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        <div className="empty-state">
                          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>🏢</div>
                          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.35rem' }}>
                            {filterStatus === 'ALL' ? 'No bookings found' : `No ${filterStatus.toLowerCase()} bookings`}
                          </p>
                          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.25rem' }}>
                            {filterStatus === 'ALL' ? 'Create a new request to reserve a room.' : 'Try selecting a different filter.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((booking, idx) => {
                      const st = getStatus(booking.status)
                      // Allow cancellation only if it's not already cancelled or rejected
                      const canCancel = booking.status === 'PENDING' || booking.status === 'APPROVED';

                      return (
                        <tr
                          key={booking.id}
                          className="booking-row"
                          onMouseEnter={() => setHoveredRow(booking.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{
                            borderBottom: idx < filtered.length - 1 ? '1px solid #e2e8f0' : 'none',
                            background: hoveredRow === booking.id ? '#f8fafc' : 'transparent',
                          }}
                        >
                          {/* Resource */}
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                🏢
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                                  Resource #{booking.resourceId}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                                  {booking.purpose ? booking.purpose.substring(0, 32) + (booking.purpose.length > 32 ? '…' : '') : 'No purpose specified'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ fontWeight: 500, color: '#334155' }}>{fmt(booking.startTime, 'date')}</div>
                          </td>

                          {/* Time */}
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.25rem 0.6rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>{fmt(booking.startTime, 'time')}</span>
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>→</span>
                              <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>{fmt(booking.endTime, 'time')}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                              background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                              borderRadius: 100, padding: '0.25rem 0.75rem',
                              fontSize: '0.75rem', fontWeight: 600,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0,
                                ...(booking.status === 'PENDING' ? { animation: 'pulse 1.5s infinite' } : {})
                              }} />
                              {st.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button 
                                className="action-btn" 
                                disabled={!canCancel}
                                onClick={() => navigate(`/dashboard/user/resources/${booking.resourceId}`)}
                                title="Go to Resource to modify"
                              >
                                Modify
                              </button>
                              <button 
                                className="action-btn cancel" 
                                disabled={!canCancel}
                                onClick={() => setCancelTarget(booking.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <CreateBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { setIsModalOpen(false); loadBookings(); }}
      />

      {/* Cancellation Confirmation Modal */}
      {cancelTarget && (
        <div className="cancel-overlay">
          <div className="cancel-box">
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#0f172a' }}>Cancel Reservation?</h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to cancel this booking? This action cannot be undone. If it was approved, the slot will be released back to the public.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setCancelTarget(null)} 
                disabled={isCancelling}
                style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 500, cursor: 'pointer' }}
              >
                Keep Booking
              </button>
              <button 
                onClick={handleCancelBooking} 
                disabled={isCancelling}
                style={{ padding: '0.5rem 1rem', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, bg, textColor = '#fff', icon, loading }) {
  const isAccent = textColor === '#fff'
  return (
    <div className="stat-card" style={{
      background: bg, borderRadius: 12, padding: '1.25rem',
      border: isAccent ? 'none' : '1px solid #e2e8f0',
      boxShadow: isAccent ? '0 10px 15px -3px rgba(33,147,176,0.3)' : 'none',
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isAccent ? 'rgba(255,255,255,0.9)' : '#64748b' }}>
          {label}
        </span>
        <span style={{ fontSize: '1.25rem', opacity: 0.9 }}>{icon}</span>
      </div>
      {loading
        ? <div style={{ height: 32, width: 48, borderRadius: 6, background: isAccent ? 'rgba(255,255,255,0.3)' : '#e2e8f0', animation: 'pulse 1.4s infinite' }} />
        : <span style={{ fontSize: '2rem', fontWeight: 700, color: textColor, lineHeight: 1 }}>
            {value}
          </span>
      }
    </div>
  )
}