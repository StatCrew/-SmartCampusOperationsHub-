import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getBookingAnalytics, getAllBookings } from '../../../api/bookingApi'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

// ── Status config ─────────────────────────────────────────────────
const STATUS = {
  PENDING:   { color: '#d97706', bg: 'rgba(217,119,6,0.09)',   border: 'rgba(217,119,6,0.22)',   dot: '#d97706', label: 'Pending'   },
  APPROVED:  { color: '#0e9e84', bg: 'rgba(14,158,132,0.09)',  border: 'rgba(14,158,132,0.22)',  dot: '#0e9e84', label: 'Approved'  },
  REJECTED:  { color: '#e53e3e', bg: 'rgba(229,62,62,0.09)',   border: 'rgba(229,62,62,0.22)',   dot: '#e53e3e', label: 'Rejected'  },
  CANCELLED: { color: '#718096', bg: 'rgba(113,128,150,0.09)', border: 'rgba(113,128,150,0.22)', dot: '#718096', label: 'Cancelled' },
}
const getS = s => STATUS[s] || STATUS.PENDING

// ── Animated counter ──────────────────────────────────────────────
function AnimatedNumber({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!value) {
      const resetTimer = setTimeout(() => setDisplay(0), 0)
      return () => clearTimeout(resetTimer)
    }
    let cur = 0
    const step = Math.max(1, Math.ceil(value / (duration / 16)))
    const t = setInterval(() => {
      cur = Math.min(cur + step, value)
      setDisplay(cur)
      if (cur >= value) clearInterval(t)
    }, 16)
    return () => clearInterval(t)
  }, [value, duration])
  return <span>{display.toLocaleString()}</span>
}

// ── Donut chart ───────────────────────────────────────────────────
function DonutChart({ segments = [], total }) {
  const r = 42, cx = 60, cy = 60, circ = 2 * Math.PI * r
  const tot = segments.reduce((s, x) => s + (x.value || 0), 0) || 1
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8f5f3" strokeWidth="13" />
      {segments.map((seg, i) => {
        const offset = segments
          .slice(0, i)
          .reduce((sum, item) => sum + ((item.value || 0) / tot) * circ, 0)
        const dash = (seg.value / tot) * circ
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="13"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset} strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 1s ease', transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }}
          />
        )
      })}
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize="17" fontWeight="800" fill="#0d2b25" fontFamily="'Playfair Display',serif">{total ?? tot}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="#7ab5a8" fontWeight="700" letterSpacing="1">TOTAL</text>
    </svg>
  )
}

// ── Mini sparkline bars ───────────────────────────────────────────
function SparkBars({ data = [], color = '#0e9e84' }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32, marginTop: 8 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 3,
          background: color,
          opacity: 0.35 + 0.65 * (i / (data.length - 1)),
          height: `${Math.max(8, (v / max) * 100)}%`,
          transition: 'height 0.6s ease',
        }} />
      ))}
    </div>
  )
}

// ── KPI Stat Card ─────────────────────────────────────────────────
function StatCard({ label, value, icon, gradient, textColor = '#fff', subColor = 'rgba(255,255,255,0.7)', sparkData, delay = 0 }) {
  const isLight = textColor !== '#fff'
  return (
    <div style={{
      background: gradient, borderRadius: 20, padding: '1.25rem 1.4rem',
      boxShadow: isLight ? '0 2px 12px rgba(14,158,132,0.08)' : '0 6px 24px rgba(14,158,132,0.28)',
      border: isLight ? '1px solid rgba(14,158,132,0.15)' : 'none',
      animation: `fadeUp 0.45s cubic-bezier(.22,1,.36,1) ${delay}s both`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: subColor }}>
          {label}
        </span>
        <span style={{ fontSize: '1.25rem', opacity: 0.75 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', fontWeight: 700, color: textColor, lineHeight: 1.1 }}>
        <AnimatedNumber value={value || 0} />
      </div>
      {sparkData && <SparkBars data={sparkData} color={isLight ? '#0e9e84' : 'rgba(255,255,255,0.9)'} />}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const st = getS(status)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: st.bg, color: st.color, border: `1px solid ${st.border}`,
      borderRadius: 100, padding: '0.22rem 0.7rem',
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot, flexShrink: 0,
        ...(status === 'PENDING' ? { animation: 'pulse 1.5s infinite' } : {})
      }} />
      {st.label}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────
function SkeletonRows({ n = 5 }) {
  return Array.from({ length: n }).map((_, i) => (
    <tr key={i}>
      {[80, 60, 55, 45].map((w, j) => (
        <td key={j} style={{ padding: '0.85rem 1.25rem' }}>
          <div style={{ height: 12, width: `${w}%`, borderRadius: 6, background: 'linear-gradient(90deg,#e8f5f3 25%,#d0eeea 50%,#e8f5f3 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        </td>
      ))}
    </tr>
  ))
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AdminBookingAnalyticsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [analytics,    setAnalytics]    = useState(null)
  const [bookings,     setBookings]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tableLoad,    setTableLoad]    = useState(true)
  const [error,        setError]        = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search,       setSearch]       = useState('')
  const [debSearch,    setDebSearch]    = useState('')
  const [page,         setPage]         = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)
  const [refreshKey,   setRefreshKey]   = useState(0)
  const [hoveredRow,   setHoveredRow]   = useState(null)
  const [spinning,     setSpinning]     = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const loadAnalytics = useCallback(async () => {
    setLoading(true); setError('')
    try { setAnalytics(await getBookingAnalytics()) }
    catch (e) { setError(getApiErrorMessage(e)) }
    finally { setLoading(false) }
  }, [getApiErrorMessage])

  const loadBookings = useCallback(async () => {
    setTableLoad(true)
    try {
      const r = await getAllBookings({ page, size: 8, ...(statusFilter !== 'ALL' && { status: statusFilter }), ...(debSearch && { search: debSearch }) })
      setBookings(r.content ?? [])
      setTotalPages(r.totalPages ?? 1)
    } catch (e) { console.error(e) }
    finally { setTableLoad(false) }
  }, [page, statusFilter, debSearch])

  useEffect(() => { loadAnalytics() }, [loadAnalytics, refreshKey])
  useEffect(() => { loadBookings()  }, [loadBookings,  refreshKey])
  useEffect(() => { setPage(0)      }, [statusFilter, debSearch])

  const handleLogout = () => { logout(); navigate('/signin', { replace: true }) }
  const handleRefresh = () => { setSpinning(true); setRefreshKey(k => k + 1); setTimeout(() => setSpinning(false), 800) }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map(i => ({ ...i, active: i.path === location.pathname })),
    [location.pathname, role]
  )

  const donutSegs = analytics ? [
    { label: 'Approved', value: analytics.approvedRequests || 0, color: '#0e9e84' },
    { label: 'Pending',  value: analytics.pendingRequests  || 0, color: '#d97706' },
    { label: 'Rejected', value: analytics.rejectedRequests || 0, color: '#e53e3e' },
  ] : []

  const approvalRate = analytics?.totalBookings > 0
    ? Math.round((analytics.approvedRequests / analytics.totalBookings) * 100) : 0

  const rejectionRate = analytics?.totalBookings > 0
    ? Math.round((analytics.rejectedRequests / analytics.totalBookings) * 100) : 0

  const pendingRate = analytics?.totalBookings > 0
    ? Math.round((analytics.pendingRequests / analytics.totalBookings) * 100) : 0

  const statusCounts = {
    ALL:      analytics?.totalBookings     || 0,
    PENDING:  analytics?.pendingRequests   || 0,
    APPROVED: analytics?.approvedRequests  || 0,
    REJECTED: analytics?.rejectedRequests  || 0,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0faf8', fontFamily: "'DM Sans', sans-serif", color: '#0d2b25' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes pulse   { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes growBar { from{width:0} to{width:var(--w)} }

        .page-fade { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) both }

        .search-input {
          width:100%; box-sizing:border-box;
          border:1.5px solid #b2ddd7; border-radius:12px;
          padding:0.55rem 0.85rem 0.55rem 2.2rem;
          font-size:0.85rem; font-family:'DM Sans',sans-serif;
          color:#0d2b25; background:#fff; outline:none;
          transition:border-color 0.15s, box-shadow 0.15s;
        }
        .search-input:focus { border-color:#0e9e84; box-shadow:0 0 0 3px rgba(14,158,132,0.12) }
        .search-input::placeholder { color:#7ab5a8 }

        .filter-chip {
          font-family:'DM Sans',sans-serif; font-size:0.73rem; font-weight:600;
          padding:0.32rem 0.85rem; border-radius:100px;
          border:1.5px solid #b2ddd7; background:#fff; color:#2e6b5e;
          cursor:pointer; transition:all 0.15s; letter-spacing:0.03em;
          display:inline-flex; align-items:center; gap:0.4rem;
        }
        .filter-chip:hover   { border-color:#0e9e84; color:#0e9e84 }
        .filter-chip.active  { background:linear-gradient(135deg,#0e9e84,#0cbfa0); border-color:transparent; color:#fff; box-shadow:0 2px 10px rgba(14,158,132,0.3) }
        .chip-count { font-size:0.65rem; font-weight:800; padding:0.1rem 0.45rem; border-radius:100px; background:rgba(255,255,255,0.25) }
        .filter-chip:not(.active) .chip-count { background:rgba(14,158,132,0.1); color:#0e9e84 }

        .refresh-btn {
          display:flex; align-items:center; gap:0.5rem;
          background:#fff; border:1.5px solid #b2ddd7; border-radius:12px;
          padding:0.55rem 1.1rem; font-size:0.82rem; font-weight:600;
          color:#2e6b5e; cursor:pointer; font-family:'DM Sans',sans-serif;
          transition:all 0.15s; box-shadow:0 2px 8px rgba(14,158,132,0.08);
        }
        .refresh-btn:hover { border-color:#0e9e84; background:#f0faf8; color:#0e9e84 }
        .spin { animation:spin 0.7s linear infinite }

        .booking-row { transition:background 0.12s }

        .insight-row { display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid #e8f5f3 }
        .insight-row:last-child { border:none }

        .pagination-btn {
          border:1.5px solid #b2ddd7; border-radius:10px;
          padding:0.4rem 0.9rem; font-size:0.78rem; font-weight:600;
          color:#2e6b5e; background:#fff; cursor:pointer;
          font-family:'DM Sans',sans-serif; transition:all 0.15s;
        }
        .pagination-btn:hover:not(:disabled) { border-color:#0e9e84; color:#0e9e84; background:#f0faf8 }
        .pagination-btn:disabled { opacity:0.35; cursor:not-allowed }
      `}</style>

      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={i => i.path && navigate(i.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div style={{ minHeight: '100vh', transition: 'padding-left 0.3s', paddingLeft: isSidebarExpanded ? 256 : 80 }}>
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Admin" title="Campus Analytics" />

        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Error banner */}
          {error && (
            <div style={{ borderRadius: 12, background: '#fef2f2', border: '1px solid rgba(229,62,62,0.2)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#c53030', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠️</span> {error}
              <button onClick={handleRefresh} style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
            </div>
          )}

          {/* ── Page title ── */}
          <div className="page-fade" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0e9e84', margin: '0 0 0.25rem' }}>
                Admin Dashboard
              </p>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: '#0d2b25', margin: 0, lineHeight: 1.2 }}>
                Booking Analytics
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#7ab5a8', margin: '0.3rem 0 0' }}>
                Campus resource utilization and request statuses.
              </p>
            </div>
            <button className="refresh-btn" onClick={handleRefresh}>
              <span className={spinning ? 'spin' : ''} style={{ display: 'inline-block', fontSize: '1rem' }}>↻</span>
              Refresh
            </button>
          </div>

          {/* ── KPI Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 130, borderRadius: 20, background: 'linear-gradient(90deg,#e8f5f3 25%,#d0eeea 50%,#e8f5f3 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              ))
            ) : (<>
              <StatCard label="Total Bookings" value={analytics?.totalBookings}    icon="📋" gradient="linear-gradient(135deg,#0e9e84,#0cbfa0,#14c9ab)" delay={0.05} />
              <StatCard label="Pending"        value={analytics?.pendingRequests}  icon="⏳" gradient="linear-gradient(135deg,#fffbeb,#fef3c7)" textColor="#92400e" subColor="#b45309" delay={0.1} />
              <StatCard label="Approved"       value={analytics?.approvedRequests} icon="✅" gradient="linear-gradient(135deg,#d6f5ef,#b2ddd7)" textColor="#0a7a65" subColor="#2e6b5e" delay={0.15} />
              <StatCard label="Rejected"       value={analytics?.rejectedRequests} icon="✗"  gradient="linear-gradient(135deg,#fef2f2,#fecaca)" textColor="#c53030" subColor="#e53e3e" delay={0.2} />
            </>)}
          </div>

          {/* ── Insights Row ── */}
          {!loading && analytics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', animation: 'fadeUp 0.4s 0.25s cubic-bezier(.22,1,.36,1) both' }}>

              {/* Donut */}
              <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #b2ddd7', padding: '1.4rem', boxShadow: '0 4px 20px rgba(14,158,132,0.07)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7ab5a8', margin: '0 0 1.1rem' }}>Status Breakdown</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <DonutChart segments={donutSegs} total={analytics.totalBookings} />
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                    {donutSegs.map(s => (
                      <li key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', color: '#2e6b5e', flex: 1 }}>{s.label}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0d2b25' }}>{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Approval rate */}
              <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #b2ddd7', padding: '1.4rem', boxShadow: '0 4px 20px rgba(14,158,132,0.07)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7ab5a8', margin: '0 0 0.75rem' }}>Approval Rate</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.3rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', fontWeight: 700, color: '#0d2b25', lineHeight: 1 }}>{approvalRate}</span>
                  <span style={{ fontSize: '1.4rem', color: '#7ab5a8', paddingBottom: '0.3rem' }}>%</span>
                </div>
                {/* Stacked progress bar */}
                <div style={{ height: 10, borderRadius: 100, background: '#e8f5f3', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${approvalRate}%`, background: 'linear-gradient(90deg,#0e9e84,#14c9ab)', transition: 'width 1.2s ease', borderRadius: 100 }} />
                </div>
                <p style={{ fontSize: '0.73rem', color: '#7ab5a8', margin: '0.5rem 0 0' }}>
                  {analytics.approvedRequests} approved of {analytics.totalBookings} total
                </p>
              </div>

              {/* Quick stats */}
              <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #b2ddd7', padding: '1.4rem', boxShadow: '0 4px 20px rgba(14,158,132,0.07)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7ab5a8', margin: '0 0 0.75rem' }}>Quick Insights</p>
                {[
                  { label: 'Rejection Rate',    value: `${rejectionRate}%`, color: '#e53e3e', bar: rejectionRate },
                  { label: 'Pending Rate',       value: `${pendingRate}%`,   color: '#d97706', bar: pendingRate  },
                  { label: 'Resolved',           value: (analytics.approvedRequests || 0) + (analytics.rejectedRequests || 0), color: '#0e9e84' },
                  { label: 'Awaiting Action',    value: analytics.pendingRequests || 0, color: '#2e6b5e' },
                ].map(item => (
                  <div key={item.label} className="insight-row">
                    <span style={{ fontSize: '0.8rem', color: '#7ab5a8' }}>{item.label}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Bookings Table Card ── */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #b2ddd7', overflow: 'hidden', boxShadow: '0 4px 24px rgba(14,158,132,0.08)', animation: 'fadeUp 0.4s 0.3s cubic-bezier(.22,1,.36,1) both' }}>

            {/* Table top bar */}
            <div style={{ padding: '1rem 1.5rem', background: 'linear-gradient(135deg,#f0faf8,#e8f5f3)', borderBottom: '1px solid #e8f5f3', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: '#0d2b25' }}>Recent Bookings</span>
                {!tableLoad && <span style={{ marginLeft: '0.6rem', fontSize: '0.72rem', color: '#7ab5a8', fontWeight: 600 }}>{bookings.length} shown</span>}
              </div>
              {/* Search */}
              <div style={{ position: 'relative', width: 220 }}>
                <span style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#7ab5a8', pointerEvents: 'none' }}>🔍</span>
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search bookings…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filter chips */}
            <div style={{ padding: '0.75rem 1.5rem', background: '#fafffe', borderBottom: '1px solid #e8f5f3', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                <button
                  key={s}
                  className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'ALL' ? 'All Bookings' : s.charAt(0) + s.slice(1).toLowerCase()}
                  <span className="chip-count">{statusCounts[s]}</span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e8f5f3' }}>
                    {['Resource', 'User', 'Date', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.8rem 1.25rem', textAlign: 'left', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7ab5a8', background: '#fafffe' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableLoad ? (
                    <SkeletonRows n={6} />
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: '#0d2b25', margin: '0 0 0.3rem' }}>No bookings found</p>
                        <p style={{ fontSize: '0.8rem', color: '#7ab5a8', margin: 0 }}>Try adjusting your search or filter.</p>
                      </td>
                    </tr>
                  ) : bookings.map((b, idx) => (
                    <tr
                      key={b.id ?? idx}
                      className="booking-row"
                      onMouseEnter={() => setHoveredRow(b.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: idx < bookings.length - 1 ? '1px solid #e8f5f3' : 'none',
                        background: hoveredRow === b.id ? '#f7fdfc' : 'transparent',
                      }}
                    >
                      {/* Resource */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#d6f5ef,#b2ddd7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                            🏢
                          </div>
                          <span style={{ fontWeight: 700, color: '#0d2b25', fontSize: '0.85rem' }}>
                            {b.resourceName ?? b.resource?.name ?? `Resource #${b.resourceId ?? '—'}`}
                          </span>
                        </div>
                      </td>
                      {/* User */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#0e9e84,#14c9ab)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>
                            {(b.userName ?? b.user?.name ?? '?')[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.82rem', color: '#2e6b5e', fontWeight: 500 }}>
                            {b.userName ?? b.user?.name ?? b.userId ?? '—'}
                          </span>
                        </div>
                      </td>
                      {/* Date */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span style={{ fontSize: '0.82rem', color: '#0d2b25', fontWeight: 600 }}>
                          {b.startTime ? new Date(b.startTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      {/* Status */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem', borderTop: '1px solid #e8f5f3', background: '#fafffe' }}>
                <span style={{ fontSize: '0.75rem', color: '#7ab5a8', fontWeight: 500 }}>
                  Page <strong style={{ color: '#0d2b25' }}>{page + 1}</strong> of {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="pagination-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <button className="pagination-btn" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
