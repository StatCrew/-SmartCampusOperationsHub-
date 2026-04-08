import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getUserBookings } from '../../../api/bookingApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'
import CreateBookingModal from './components/CreateBookingModal'

// ── Status config ──────────────────────────────────────────────────
const STATUS_CONFIG = {
  APPROVED:  { color: '#0e9e84', bg: 'rgba(14,158,132,0.1)',  border: 'rgba(14,158,132,0.25)', dot: '#0e9e84',  label: 'Approved'  },
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

// ── Skeleton row ──────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[1,2,3].map(i => (
        <td key={i} className="px-6 py-4">
          <div style={{ height: 14, borderRadius: 7, background: 'linear-gradient(90deg,#e8f5f3 25%,#d0eeea 50%,#e8f5f3 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', width: i === 3 ? '60%' : '85%' }} />
        </td>
      ))}
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
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

  const loadBookings = useCallback(async () => {
    if (!user?.id) return
    setLoading(true); setErrorMessage('')
    try {
      const data = await getUserBookings(user.id)
      setBookings(data?.content || data || [])
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

  return (
    <div style={{ minHeight: '100vh', background: '#f0faf8', fontFamily: "'DM Sans', sans-serif", color: '#0d2b25' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

        @keyframes shimmer { to { background-position: -200% 0 } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }

        .page-fade { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) both }
        .stat-card { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) both }
        .stat-card:nth-child(1) { animation-delay: 0.05s }
        .stat-card:nth-child(2) { animation-delay: 0.1s  }
        .stat-card:nth-child(3) { animation-delay: 0.15s }
        .stat-card:nth-child(4) { animation-delay: 0.2s  }

        .request-btn {
          background: linear-gradient(135deg,#0e9e84,#0cbfa0,#14c9ab);
          color: #fff; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 700;
          padding: 0.65rem 1.35rem; border-radius: 12px;
          box-shadow: 0 4px 16px rgba(14,158,132,0.35);
          transition: filter 0.15s, transform 0.1s, box-shadow 0.15s;
          display: flex; align-items: center; gap: 0.4rem; white-space: nowrap;
        }
        .request-btn:hover {
          filter: brightness(1.07); transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(14,158,132,0.4);
        }
        .request-btn:active { transform: translateY(0) }

        .filter-chip {
          font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 600;
          padding: 0.35rem 0.9rem; border-radius: 100px; border: 1.5px solid #b2ddd7;
          background: #fff; color: #2e6b5e; cursor: pointer;
          transition: all 0.15s; letter-spacing: 0.03em;
        }
        .filter-chip:hover   { border-color: #0e9e84; color: #0e9e84 }
        .filter-chip.active  {
          background: linear-gradient(135deg,#0e9e84,#0cbfa0);
          border-color: transparent; color: #fff;
          box-shadow: 0 2px 8px rgba(14,158,132,0.3);
        }

        .booking-row { transition: background 0.12s }
        .booking-row:hover { background: #f0faf8 }

        .empty-state { text-align:center; padding: 4rem 2rem }

        .error-banner {
          border-radius: 12px; background: #fef2f2; border: 1px solid rgba(229,62,62,0.2);
          padding: 0.75rem 1rem; font-size: 0.875rem; color: #c53030;
          margin-bottom: 1.5rem; display:flex; align-items:center; gap:0.5rem;
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
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Student" title="My Bookings" />

        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

          {errorMessage && (
            <div className="error-banner">
              <span>⚠️</span> {errorMessage}
            </div>
          )}

          {/* ── Page title + CTA ── */}
          <div className="page-fade" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0e9e84', margin: '0 0 0.25rem' }}>
                Campus Facilities
              </p>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: '#0d2b25', margin: 0, lineHeight: 1.2 }}>
                My Reservations
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#7ab5a8', marginTop: '0.3rem' }}>
                View and manage your campus facility bookings.
              </p>
            </div>
            <button className="request-btn" onClick={() => setIsModalOpen(true)}>
              <span style={{ fontSize: '1rem' }}>＋</span> Request Room
            </button>
          </div>

          {/* ── Stat Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            <StatCard label="Total Bookings" value={stats.total}    color="#0e9e84" bg="linear-gradient(135deg,#0e9e84,#14c9ab)" icon="📋" loading={loading} />
            <StatCard label="Approved"       value={stats.approved} color="#0e9e84" bg="linear-gradient(135deg,#d6f5ef,#b2ddd7)" textColor="#0a7a65" icon="✅" loading={loading} />
            <StatCard label="Pending"        value={stats.pending}  color="#d97706" bg="linear-gradient(135deg,#fffbeb,#fde68a)" textColor="#92400e" icon="⏳" loading={loading} />
            <StatCard label="Rejected"       value={stats.rejected} color="#e53e3e" bg="linear-gradient(135deg,#fef2f2,#fecaca)" textColor="#c53030" icon="✗"  loading={loading} />
          </div>

          {/* ── Table Card ── */}
          <div className="page-fade" style={{ animationDelay: '0.25s', background: '#fff', borderRadius: 20, border: '1px solid #b2ddd7', overflow: 'hidden', boxShadow: '0 4px 24px rgba(14,158,132,0.08)' }}>

            {/* Table header bar */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e8f5f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', background: 'linear-gradient(135deg,#f0faf8,#e8f5f3)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2e6b5e', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {filtered.length} {filtered.length === 1 ? 'booking' : 'bookings'}
                {filterStatus !== 'ALL' && ` · ${filterStatus.toLowerCase()}`}
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
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
                  <tr style={{ borderBottom: '1px solid #e8f5f3' }}>
                    {['Resource', 'Date', 'Time', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1.5rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7ab5a8', background: '#fafffe' }}>
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
                      <td colSpan="4">
                        <div className="empty-state">
                          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏢</div>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: '#0d2b25', margin: '0 0 0.35rem' }}>
                            {filterStatus === 'ALL' ? 'No bookings yet' : `No ${filterStatus.toLowerCase()} bookings`}
                          </p>
                          <p style={{ fontSize: '0.82rem', color: '#7ab5a8', margin: '0 0 1.25rem' }}>
                            {filterStatus === 'ALL' ? 'Request a room to get started.' : 'Try a different filter.'}
                          </p>
                          {filterStatus === 'ALL' && (
                            <button className="request-btn" style={{ margin: '0 auto' }} onClick={() => setIsModalOpen(true)}>
                              ＋ Request Room
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((booking, idx) => {
                      const st = getStatus(booking.status)
                      return (
                        <tr
                          key={booking.id}
                          className="booking-row"
                          onMouseEnter={() => setHoveredRow(booking.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{
                            borderBottom: idx < filtered.length - 1 ? '1px solid #e8f5f3' : 'none',
                            background: hoveredRow === booking.id ? '#f7fdfc' : 'transparent',
                            transition: 'background 0.12s',
                          }}
                        >
                          {/* Resource */}
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#d6f5ef,#b2ddd7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                🏢
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0d2b25', fontSize: '0.875rem' }}>
                                  Resource #{booking.resourceId}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#7ab5a8', marginTop: 1 }}>
                                  {booking.purpose ? booking.purpose.substring(0, 32) + (booking.purpose.length > 32 ? '…' : '') : 'No purpose specified'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ fontWeight: 600, color: '#0d2b25' }}>{fmt(booking.startTime, 'date')}</div>
                          </td>

                          {/* Time */}
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#f0faf8', border: '1px solid #b2ddd7', borderRadius: 8, padding: '0.2rem 0.6rem' }}>
                              <span style={{ fontSize: '0.72rem', color: '#2e6b5e', fontWeight: 600 }}>
                                {fmt(booking.startTime, 'time')}
                              </span>
                              <span style={{ color: '#7ab5a8', fontSize: '0.65rem' }}>→</span>
                              <span style={{ fontSize: '0.72rem', color: '#2e6b5e', fontWeight: 600 }}>
                                {fmt(booking.endTime, 'time')}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                              background: st.bg, color: st.color,
                              border: `1px solid ${st.border}`,
                              borderRadius: 100, padding: '0.25rem 0.75rem',
                              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0,
                                ...(booking.status === 'PENDING' ? { animation: 'pulse 1.5s infinite' } : {})
                              }} />
                              {st.label}
                            </span>
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
        onSuccess={loadBookings}
      />
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, bg, textColor = '#fff', icon, loading }) {
  const isAccent = textColor === '#fff'
  return (
    <div className="stat-card" style={{
      background: bg, borderRadius: 16, padding: '1.1rem 1.25rem',
      border: isAccent ? 'none' : '1px solid rgba(14,158,132,0.15)',
      boxShadow: isAccent ? '0 4px 20px rgba(14,158,132,0.25)' : 'none',
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isAccent ? 'rgba(255,255,255,0.75)' : textColor, opacity: 0.85 }}>
          {label}
        </span>
        <span style={{ fontSize: '1.1rem', opacity: 0.85 }}>{icon}</span>
      </div>
      {loading
        ? <div style={{ height: 28, width: 48, borderRadius: 8, background: isAccent ? 'rgba(255,255,255,0.3)' : 'rgba(14,158,132,0.1)', animation: 'pulse 1.4s infinite' }} />
        : <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: textColor, lineHeight: 1 }}>
            {value}
          </span>
      }
    </div>
  )
}
