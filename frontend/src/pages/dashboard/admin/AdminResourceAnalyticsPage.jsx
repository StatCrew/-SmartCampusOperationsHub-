import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAllResources, RESOURCE_TYPES, formatResourceType } from '../../../api/resourceApi'
import { getAllBookings } from '../../../api/bookingApi'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

const RESOURCE_CONFIG = {
  LECTURE_HALL: { label: 'Lecture Hall',  color: '#2563eb', bg: 'rgba(37,99,235,0.1)',  icon: '🎓' },
  LAB:          { label: 'Laboratory',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: '🔬' },
  MEETING_ROOM: { label: 'Meeting Room',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',icon: '🤝' },
  EQUIPMENT:    { label: 'Equipment',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '⚙️' },
}
const STATUS_CONFIG = {
  ACTIVE:         { label: 'Active',         color: '#2563eb', bg: 'rgba(37,99,235,0.09)',  border: 'rgba(37,99,235,0.25)'  },
  OUT_OF_SERVICE: { label: 'Out of Service', color: '#e53e3e', bg: 'rgba(229,62,62,0.09)',  border: 'rgba(229,62,62,0.25)'  },
}

function AnimatedNumber({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!value) { setDisplay(0); return }
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

function DonutChart({ segments = [], total, centerLabel = 'TOTAL' }) {
  const r = 42, cx = 60, cy = 60, circ = 2 * Math.PI * r
  const tot = segments.reduce((s, x) => s + (x.value || 0), 0) || 1
  let offset = 0
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#dbeafe" strokeWidth="13" />
      {segments.map((seg, i) => {
        const dash = (seg.value / tot) * circ
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="13"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset} strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 1s ease', transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }}
          />
        )
        offset += dash
        return el
      })}
      <text x={cx} y={53} textAnchor="middle" fontSize="17" fontWeight="800" fill="#0d2b25" fontFamily="'Poppins', sans-serif">{total ?? tot}</text>
      <text x={cx} y={70} textAnchor="middle" fontSize="8" fill="#93c5fd" fontWeight="700" letterSpacing="1">{centerLabel}</text>
    </svg>
  )
}

function StatCard({ label, value, icon, gradient, textColor = '#fff', subColor = 'rgba(255,255,255,0.7)', sub, delay = 0 }) {
  const isLight = textColor !== '#fff'
  return (
    <div style={{
      background: gradient, borderRadius: 20, padding: '1.25rem 1.4rem',
      boxShadow: isLight ? '0 2px 12px rgba(37,99,235,0.08)' : '0 6px 24px rgba(37,99,235,0.28)',
      border: isLight ? '1px solid rgba(37,99,235,0.15)' : 'none',
      animation: `fadeUp 0.45s cubic-bezier(.22,1,.36,1) ${delay}s both`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: subColor }}>
          {label}
        </span>
        <span style={{ fontSize: '1.25rem', opacity: 0.75 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '2.2rem', fontWeight: 700, color: textColor, lineHeight: 1.1 }}>
        <AnimatedNumber value={value || 0} />
      </div>
      {sub && <div style={{ fontSize: '0.72rem', color: subColor, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function RankBar({ rank, icon, label, value, maxValue, color, subLabel }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0' }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.63rem', fontWeight: 800, color: '#1e40af', flexShrink: 0,
      }}>{rank}</div>
      <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0d2b25', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0d2b25', marginLeft: 8, flexShrink: 0 }}>
            {value} <span style={{ fontWeight: 400, color: '#93c5fd', fontSize: '0.7rem' }}>bookings</span>
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 100, background: '#dbeafe', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 100, background: `linear-gradient(90deg,${color},${color}bb)`, transition: 'width 1.1s cubic-bezier(.22,1,.36,1)' }} />
        </div>
        {subLabel && <span style={{ fontSize: '0.68rem', color: '#93c5fd', marginTop: 3, display: 'block' }}>{subLabel}</span>}
      </div>
    </div>
  )
}

function SkeletonRows({ cols = 8, n = 6 }) {
  const widths = [75, 60, 65, 30, 55, 25, 25, 40]
  return Array.from({ length: n }).map((_, i) => (
    <tr key={i}>
      {widths.slice(0, cols).map((w, j) => (
        <td key={j} style={{ padding: '0.85rem 1.1rem' }}>
          <div style={{ height: 12, width: `${w}%`, borderRadius: 6, background: 'linear-gradient(90deg,#dbeafe 25%,#bfdbfe 50%,#dbeafe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        </td>
      ))}
    </tr>
  ))
}

function BookingBar({ approved, pending, rejected, cancelled, total }) {
  if (!total) return <span style={{ fontSize: '0.72rem', color: '#bfdbfe' }}>No bookings</span>
  const pct = (v) => Math.round((v / total) * 100)
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', width: 64, gap: 1 }}>
        {approved  > 0 && <div style={{ flex: approved,  background: '#2563eb' }} />}
        {pending   > 0 && <div style={{ flex: pending,   background: '#d97706' }} />}
        {rejected  > 0 && <div style={{ flex: rejected,  background: '#e53e3e' }} />}
        {cancelled > 0 && <div style={{ flex: cancelled, background: '#718096' }} />}
      </div>
      <span style={{ fontSize: '0.68rem', color: '#1e40af', fontWeight: 600 }}>{pct(approved)}%✓</span>
    </div>
  )
}

export default function AdminResourceAnalyticsPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [resources, setResources] = useState([])
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [spinning,  setSpinning]  = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [sortBy,    setSortBy]    = useState('bookings')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [hoveredRow, setHoveredRow] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [res, bkgs] = await Promise.all([
        getAllResources(),
        getAllBookings({ size: 1000 }),
      ])
      setResources(Array.isArray(res) ? res : [])
      setBookings(bkgs?.content ?? [])
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [getApiErrorMessage])

  useEffect(() => { load() }, [load, refreshKey])

  const handleLogout = () => { logout(); navigate('/signin', { replace: true }) }
  const handleRefresh = () => { setSpinning(true); setRefreshKey(k => k + 1); setTimeout(() => setSpinning(false), 900) }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map(i => ({ ...i, active: i.path === location.pathname })),
    [location.pathname, role],
  )

  const bookingMap = useMemo(() => {
    const map = {}
    for (const b of bookings) {
      const id = String(b.resourceId)
      if (!map[id]) map[id] = { total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 }
      map[id].total++
      const s = (b.status || '').toUpperCase()
      if (s === 'APPROVED')  map[id].approved++
      if (s === 'PENDING')   map[id].pending++
      if (s === 'REJECTED')  map[id].rejected++
      if (s === 'CANCELLED') map[id].cancelled++
    }
    return map
  }, [bookings])

  const enriched = useMemo(
    () => resources.map(r => ({ ...r, ...(bookingMap[String(r.id)] || { total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 }) })),
    [resources, bookingMap],
  )

  const filtered = useMemo(() => {
    const base = typeFilter === 'ALL' ? enriched : enriched.filter(r => r.type === typeFilter)
    return [...base].sort((a, b) =>
      sortBy === 'bookings'  ? b.total - a.total :
      sortBy === 'name'      ? a.name.localeCompare(b.name) :
      sortBy === 'capacity'  ? b.capacity - a.capacity : 0
    )
  }, [enriched, typeFilter, sortBy])

  const typeCounts  = useMemo(() => { const m = { ALL: enriched.length }; for (const t of RESOURCE_TYPES) m[t] = enriched.filter(r => r.type === t).length; return m }, [enriched])
  const typeMap     = useMemo(() => { const m = {}; for (const r of resources) m[r.type] = (m[r.type] || 0) + 1; return m }, [resources])
  const statusMap   = useMemo(() => { const m = {}; for (const r of resources) m[r.status] = (m[r.status] || 0) + 1; return m }, [resources])

  const totalRes    = resources.length
  const activeRes   = resources.filter(r => r.status === 'ACTIVE').length
  const bookedRes   = enriched.filter(r => r.total > 0).length
  const totalBkgs   = bookings.length
  const utilPct     = totalRes > 0 ? Math.round((bookedRes / totalRes) * 100) : 0
  const approvedBkgs = bookings.filter(b => (b.status || '').toUpperCase() === 'APPROVED').length
  const approvalRate = totalBkgs > 0 ? Math.round((approvedBkgs / totalBkgs) * 100) : 0
  const avgPerRes    = totalRes > 0 ? (totalBkgs / totalRes).toFixed(1) : '0'

  const topResources = useMemo(() => [...enriched].sort((a, b) => b.total - a.total).slice(0, 8), [enriched])
  const maxBookings  = topResources[0]?.total || 1

  const typeSegments   = Object.entries(RESOURCE_CONFIG).map(([k, v]) => ({ label: v.label, color: v.color, value: typeMap[k] || 0 }))
  const statusSegments = Object.entries(STATUS_CONFIG).map(([k, v]) => ({ label: v.label, color: v.color, value: statusMap[k] || 0 }))

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Poppins', sans-serif", color: '#0d2b25' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

        @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes pulse   { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes spin    { to{transform:rotate(360deg)} }

        .ra-spin { animation: spin 0.75s linear infinite }

        .ra-refresh-btn {
          display:flex; align-items:center; gap:0.5rem;
          background:#fff; border:1.5px solid #bfdbfe; border-radius:12px;
          padding:0.55rem 1.1rem; font-size:0.82rem; font-weight:600;
          color:#1e40af; cursor:pointer; font-family:'Poppins',sans-serif;
          transition:all 0.15s; box-shadow:0 2px 8px rgba(37,99,235,0.08);
        }
        .ra-refresh-btn:hover { border-color:#2563eb; background:#f5f8ff; color:#2563eb }

        .ra-chip {
          font-family:'Poppins',sans-serif; font-size:0.72rem; font-weight:600;
          padding:0.3rem 0.8rem; border-radius:100px;
          border:1.5px solid #bfdbfe; background:#fff; color:#1e40af;
          cursor:pointer; transition:all 0.15s; letter-spacing:0.02em;
          display:inline-flex; align-items:center; gap:0.35rem;
        }
        .ra-chip:hover   { border-color:#2563eb; color:#2563eb }
        .ra-chip.active  { background:linear-gradient(135deg,#2563eb,#3b82f6); border-color:transparent; color:#fff; box-shadow:0 2px 10px rgba(37,99,235,0.3) }
        .ra-chip-count   { font-size:0.63rem; font-weight:800; padding:0.08rem 0.4rem; border-radius:100px; background:rgba(255,255,255,0.25) }
        .ra-chip:not(.active) .ra-chip-count { background:rgba(37,99,235,0.1); color:#2563eb }

        .ra-sort-btn {
          font-family:'Poppins',sans-serif; font-size:0.71rem; font-weight:600;
          padding:0.28rem 0.72rem; border-radius:100px;
          border:1.5px solid #bfdbfe; background:#fff; color:#1e40af;
          cursor:pointer; transition:all 0.15s;
        }
        .ra-sort-btn:hover  { border-color:#2563eb; color:#2563eb }
        .ra-sort-btn.active { background:linear-gradient(135deg,#2563eb,#3b82f6); border-color:transparent; color:#fff }

        .ra-tbl-row { transition:background 0.1s; cursor:default }
        .ra-tbl-row:hover { background:#f0f9ff !important }

        .ra-insight-row { display:flex; justify-content:space-between; align-items:center; padding:0.55rem 0; border-bottom:1px solid #dbeafe }
        .ra-insight-row:last-child { border:none }

        .ra-card { background:#fff; border-radius:20px; border:1px solid #bfdbfe; padding:1.4rem; box-shadow:0 4px 20px rgba(37,99,235,0.07) }
      `}</style>

      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={(item) => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div style={{ minHeight: '100vh', transition: 'padding-left 0.3s', paddingLeft: isSidebarExpanded ? 256 : 80 }}>
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Admin" title="Resource Analytics" />

        <main style={{ maxWidth: 1160, margin: '0 auto', padding: '2rem 1.5rem 5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {error && (
            <div style={{ borderRadius: 12, background: '#fef2f2', border: '1px solid rgba(229,62,62,0.2)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#c53030', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ {error}
              <button onClick={handleRefresh} style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
            </div>
          )}

          {/* Page title */}
          <div style={{ animation: 'fadeUp 0.4s cubic-bezier(.22,1,.36,1) both', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2563eb', margin: '0 0 0.25rem' }}>Admin Dashboard</p>
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.85rem', fontWeight: 700, color: '#0d2b25', margin: 0, lineHeight: 1.2 }}>Resource Usage Analytics</h2>
              <p style={{ fontSize: '0.84rem', color: '#93c5fd', margin: '0.3rem 0 0' }}>Campus resource demand, utilization rates, and performance insights.</p>
            </div>
            <button className="ra-refresh-btn" onClick={handleRefresh}>
              <span className={spinning ? 'ra-spin' : ''} style={{ display: 'inline-block', fontSize: '1rem' }}>↻</span>
              Refresh
            </button>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '1rem' }}>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: 128, borderRadius: 20, background: 'linear-gradient(90deg,#dbeafe 25%,#bfdbfe 50%,#dbeafe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            )) : <>
              <StatCard label="Total Resources"  value={totalRes}    icon="🏢" gradient="linear-gradient(135deg,#2563eb,#3b82f6,#60a5fa)" delay={0.05} />
              <StatCard label="Active Resources"  value={activeRes}   icon="✅" gradient="linear-gradient(135deg,#dbeafe,#bfdbfe)" textColor="#1e3a8a" subColor="#1e40af" delay={0.10} sub={`${totalRes - activeRes} out of service`} />
              <StatCard label="Booked Resources"  value={bookedRes}   icon="📅" gradient="linear-gradient(135deg,#eff6ff,#dbeafe)"  textColor="#1d4ed8" subColor="#3b82f6" delay={0.15} sub={`${utilPct}% utilization rate`} />
              <StatCard label="Total Bookings"    value={totalBkgs}   icon="📋" gradient="linear-gradient(135deg,#faf5ff,#ede9fe)"  textColor="#6d28d9" subColor="#8b5cf6" delay={0.20} sub={`${avgPerRes} avg per resource`} />
              <StatCard label="Approval Rate"     value={approvalRate} icon="🎯" gradient="linear-gradient(135deg,#fffbeb,#fef3c7)" textColor="#92400e" subColor="#b45309" delay={0.25} sub={`${approvedBkgs} of ${totalBkgs} approved`} />
            </>}
          </div>

          {/* Chart row */}
          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', animation: 'fadeUp 0.4s 0.25s cubic-bezier(.22,1,.36,1) both' }}>
              {/* Resource Types */}
              <div className="ra-card">
                <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#93c5fd', margin: '0 0 1.1rem' }}>Resource Types</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <DonutChart segments={typeSegments} total={totalRes} centerLabel="RESOURCES" />
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1 }}>
                    {typeSegments.map(s => (
                      <li key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.76rem', color: '#1e40af', flex: 1 }}>{s.label}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0d2b25' }}>{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Availability Status */}
              <div className="ra-card">
                <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#93c5fd', margin: '0 0 1.1rem' }}>Availability Status</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <DonutChart segments={statusSegments} total={totalRes} centerLabel="RESOURCES" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {statusSegments.map(s => (
                      <div key={s.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: '0.76rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />{s.label}
                          </span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0d2b25' }}>{s.value}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 100, background: '#dbeafe', overflow: 'hidden' }}>
                          <div style={{ width: `${totalRes > 0 ? (s.value / totalRes) * 100 : 0}%`, height: '100%', background: s.color, borderRadius: 100, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Utilization Overview */}
              <div className="ra-card">
                <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#93c5fd', margin: '0 0 0.75rem' }}>Utilization Overview</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.3rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '3rem', fontWeight: 700, color: '#0d2b25', lineHeight: 1 }}>{utilPct}</span>
                  <span style={{ fontSize: '1.4rem', color: '#93c5fd', paddingBottom: '0.35rem' }}>%</span>
                </div>
                <div style={{ height: 10, borderRadius: 100, background: '#dbeafe', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div style={{ width: `${utilPct}%`, height: '100%', background: 'linear-gradient(90deg,#2563eb,#60a5fa)', borderRadius: 100, transition: 'width 1.2s ease' }} />
                </div>
                <p style={{ fontSize: '0.73rem', color: '#93c5fd', margin: '0 0 0.9rem' }}>{bookedRes} of {totalRes} resources have at least one booking</p>
                {[
                  { label: 'Never Booked',          value: totalRes - bookedRes, color: '#e53e3e' },
                  { label: 'Out of Service',         value: totalRes - activeRes, color: '#d97706' },
                  { label: 'Avg Bookings / Resource', value: avgPerRes,           color: '#2563eb' },
                  { label: 'Top Resource',           value: topResources[0]?.name ?? '—', color: '#6d28d9' },
                ].map(row => (
                  <div key={row.label} className="ra-insight-row">
                    <span style={{ fontSize: '0.78rem', color: '#93c5fd' }}>{row.label}</span>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: row.color, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demand Ranking */}
          {!loading && topResources.length > 0 && (
            <div className="ra-card" style={{ animation: 'fadeUp 0.4s 0.3s cubic-bezier(.22,1,.36,1) both', padding: '1.5rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#93c5fd', margin: '0 0 0.25rem' }}>Demand Ranking</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.05rem', fontWeight: 700, color: '#0d2b25', margin: '0 0 1.25rem' }}>Most Booked Resources</p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {topResources.map((r, i) => {
                  const cfg = RESOURCE_CONFIG[r.type] || { label: r.type, color: '#93c5fd', icon: '🏢' }
                  const appRate = r.total > 0 ? Math.round((r.approved / r.total) * 100) : 0
                  return (
                    <div key={r.id} style={{ borderBottom: i < topResources.length - 1 ? '1px solid #eff6ff' : 'none' }}>
                      <RankBar rank={i + 1} icon={cfg.icon} label={r.name} value={r.total} maxValue={maxBookings} color={cfg.color}
                        subLabel={r.total > 0 ? `${cfg.label} · ${appRate}% approval · ${r.location || 'N/A'}` : cfg.label} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!loading && topResources.length === 0 && (
            <div className="ra-card" style={{ animation: 'fadeUp 0.4s 0.3s cubic-bezier(.22,1,.36,1) both', textAlign: 'center', padding: '2.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#0d2b25', margin: '0 0 0.3rem' }}>No booking data yet</p>
              <p style={{ fontSize: '0.82rem', color: '#93c5fd', margin: 0 }}>Booking activity will appear here once resources receive requests.</p>
            </div>
          )}

          {/* Resource Utilization Table */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #bfdbfe', overflow: 'hidden', boxShadow: '0 4px 24px rgba(37,99,235,0.08)', animation: 'fadeUp 0.4s 0.35s cubic-bezier(.22,1,.36,1) both' }}>
            {/* Table header */}
            <div style={{ padding: '1rem 1.5rem', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', borderBottom: '1px solid #dbeafe', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.05rem', fontWeight: 700, color: '#0d2b25' }}>Resource Utilization</span>
                {!loading && <span style={{ marginLeft: '0.6rem', fontSize: '0.72rem', color: '#93c5fd', fontWeight: 600 }}>{filtered.length} resources</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 600, marginRight: 2 }}>Sort:</span>
                {[['bookings', 'By Demand'], ['name', 'By Name'], ['capacity', 'By Capacity']].map(([key, lbl]) => (
                  <button key={key} className={`ra-sort-btn ${sortBy === key ? 'active' : ''}`} onClick={() => setSortBy(key)}>{lbl}</button>
                ))}
              </div>
            </div>

            {/* Type filter chips */}
            <div style={{ padding: '0.75rem 1.5rem', background: '#f5f9ff', borderBottom: '1px solid #dbeafe', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
              <button className={`ra-chip ${typeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setTypeFilter('ALL')}>
                All Types <span className="ra-chip-count">{typeCounts.ALL}</span>
              </button>
              {Object.entries(RESOURCE_CONFIG).map(([key, cfg]) => (
                <button key={key} className={`ra-chip ${typeFilter === key ? 'active' : ''}`} onClick={() => setTypeFilter(key)}>
                  {cfg.icon} {cfg.label} <span className="ra-chip-count">{typeCounts[key] || 0}</span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #dbeafe' }}>
                    {['Resource', 'Type', 'Location', 'Cap.', 'Status', 'Total', 'Breakdown', 'Share'].map(h => (
                      <th key={h} style={{ padding: '0.8rem 1.1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#93c5fd', background: '#f5f9ff', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? <SkeletonRows cols={8} n={6} /> :
                   filtered.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#0d2b25', margin: '0 0 0.3rem' }}>No resources found</p>
                        <p style={{ fontSize: '0.8rem', color: '#93c5fd', margin: 0 }}>Try changing the type filter.</p>
                      </td>
                    </tr>
                  ) : filtered.map((r, i) => {
                    const cfg = RESOURCE_CONFIG[r.type] || { label: r.type, color: '#93c5fd', bg: '#dbeafe', icon: '🏢' }
                    const sCfg = STATUS_CONFIG[r.status] || { label: r.status, color: '#93c5fd', bg: '#dbeafe', border: '#bfdbfe' }
                    const sharePct = totalBkgs > 0 ? (r.total / totalBkgs * 100).toFixed(1) : '0.0'
                    const barWidth = totalBkgs > 0 ? Math.max(2, r.total / totalBkgs * 100) : 2
                    return (
                      <tr key={r.id} className="ra-tbl-row"
                        onMouseEnter={() => setHoveredRow(r.id)} onMouseLeave={() => setHoveredRow(null)}
                        style={{ borderBottom: i < filtered.length - 1 ? '1px solid #dbeafe' : 'none', background: hoveredRow === r.id ? '#f0f9ff' : 'transparent' }}>
                        <td style={{ padding: '0.85rem 1.1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg,${cfg.color}20,${cfg.color}40)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>{cfg.icon}</div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0d2b25', fontSize: '0.83rem', whiteSpace: 'nowrap' }}>{r.name}</div>
                              {r.description && <div style={{ fontSize: '0.68rem', color: '#93c5fd', marginTop: 1, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '0.22rem 0.55rem', borderRadius: 100, whiteSpace: 'nowrap' }}>{cfg.label}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem', fontSize: '0.8rem', color: '#1e40af', whiteSpace: 'nowrap' }}>{r.location || '—'}</td>
                        <td style={{ padding: '0.85rem 1.1rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0d2b25' }}>{r.capacity}</span>
                          <span style={{ fontSize: '0.68rem', color: '#93c5fd', marginLeft: 2 }}>pax</span>
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: sCfg.bg, color: sCfg.color, border: `1px solid ${sCfg.border}`, borderRadius: 100, padding: '0.2rem 0.65rem', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sCfg.color, ...(r.status === 'ACTIVE' ? { animation: 'pulse 2s infinite' } : {}) }} />
                            {sCfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem' }}>
                          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: r.total > 0 ? '#2563eb' : '#bfdbfe' }}>{r.total}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem' }}>
                          <BookingBar approved={r.approved} pending={r.pending} rejected={r.rejected} cancelled={r.cancelled} total={r.total} />
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 48, height: 7, borderRadius: 100, background: '#dbeafe', overflow: 'hidden', flexShrink: 0 }}>
                              <div style={{ width: `${barWidth}%`, height: '100%', borderRadius: 100, background: r.total > 0 ? 'linear-gradient(90deg,#2563eb,#60a5fa)' : '#dbeafe', transition: 'width 0.9s ease' }} />
                            </div>
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: r.total > 0 ? '#0d2b25' : '#bfdbfe', minWidth: 34 }}>{sharePct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            {!loading && filtered.length > 0 && (
              <div style={{ padding: '0.75rem 1.5rem', background: '#f5f9ff', borderTop: '1px solid #dbeafe', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#93c5fd', fontWeight: 600 }}>BREAKDOWN LEGEND:</span>
                {[['#2563eb', 'Approved'], ['#d97706', 'Pending'], ['#e53e3e', 'Rejected'], ['#718096', 'Cancelled']].map(([color, lbl]) => (
                  <span key={lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#1e40af', fontWeight: 500 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />{lbl}
                  </span>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
