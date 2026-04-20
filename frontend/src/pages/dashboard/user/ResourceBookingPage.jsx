import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import useAuth from '../../../context/useAuth'
import { getAllResources, getAvailabilitySlots, formatResourceType } from '../../../api/resourceApi'
import { getAllBookings } from '../../../api/bookingApi'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'
import CreateBookingModal from './components/CreateBookingModal'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const DAY_SHORT = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' }
const HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19']

// Helper to format dates correctly to local YYYY-MM-DD
function formatLocalYYYYMMDD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function slotsToKeys(slots) {
  const keys = new Set()
  slots.forEach(s => {
    const startHour = parseInt(s.startTime.split(':')[0], 10)
    let endHour = parseInt(s.endTime.split(':')[0], 10)
    const endMin = parseInt(s.endTime.split(':')[1], 10)
    if (endMin === 0 && endHour > startHour) endHour -= 1;
    for (let h = startHour; h <= endHour; h++) {
      keys.add(`${s.dayOfWeek}-${String(h).padStart(2, '0')}`)
    }
  })
  return keys
}

// 👇 FIXED: Maps bookings to specific YYYY-MM-DD dates instead of generic Days of the Week
function extractTakenData(bookings) {
  const takenMap = new Map();
  
  bookings.forEach(b => {
    const dateString = b.startTime.split('T')[0]; // "2026-04-28"

    const startT = b.startTime.split('T')[1].split(':');
    const endT = b.endTime.split('T')[1].split(':');

    const startHour = parseInt(startT[0], 10);
    const startMin = parseInt(startT[1], 10);
    const endHour = parseInt(endT[0], 10);
    const endMin = parseInt(endT[1], 10);

    for (let h = startHour; h <= endHour; h++) {
      if (h === endHour && endMin === 0) break;

      // The key is now precisely bound to the date: "2026-04-28-10"
      const key = `${dateString}-${String(h).padStart(2, '0')}`;
      const sMin = (h === startHour) ? startMin : 0;
      const eMin = (h === endHour) ? endMin : 60;

      if (!takenMap.has(key)) takenMap.set(key, []);
      takenMap.get(key).push({ start: sMin, end: eMin, booking: b });
    }
  });
  return takenMap;
}

export default function ResourceBookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [resource, setResource] = useState(null)
  const [activeKeys, setActiveKeys] = useState(new Set())
  const [takenBookings, setTakenBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 👇 NEW: Controls which week the calendar is currently looking at
  const [weekOffset, setWeekOffset] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const allResources = await getAllResources()
      const currentResource = allResources.find(r => String(r.id) === String(id))
      if (!currentResource) throw new Error('Resource not found.')
      setResource(currentResource)
      
      const slots = await getAvailabilitySlots(id)
      setActiveKeys(slotsToKeys(slots))
      
      const bookingsResponse = await getAllBookings({ size: 1000 })
      const bookings = bookingsResponse?.content || bookingsResponse || []
      
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
      const upcomingTaken = bookings.filter(b =>
        String(b.resourceId) === String(id) &&
        (b.status === 'APPROVED' || b.status === 'PENDING') &&
        new Date(b.startTime) >= startOfToday
      ).sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      
      setTakenBookings(upcomingTaken)
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Failed to load resource details.')
    } finally { setLoading(false) }
  }, [id, getApiErrorMessage])

  useEffect(() => { if (!isModalOpen) loadData() }, [loadData, isModalOpen])
  
  const handleLogout = () => { logout(); navigate('/signin', { replace: true }) }
  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map(item => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role]
  )
  const headerLabels = getHeaderLabelsByRole(role)

  const takenDataMap = useMemo(() => extractTakenData(takenBookings), [takenBookings]);

  // 👇 NEW: Dynamically generate the 7 dates to display based on the offset
  const displayDates = useMemo(() => {
    const dates = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + (weekOffset * 7)); // Shift by weeks

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekOffset]);

  if (loading && !resource) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#e0f9ff 0%,#c2effa 45%,#d9f8fb 100%)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <RBPStyles />
      <div style={{ textAlign:'center' }}>
        <div style={{ position:'relative', width:56, height:56, margin:'0 auto 1rem' }}>
          <div className="rbp-pulse-ring" />
          <div className="rbp-spinner" />
        </div>
        <p style={{ color:'#2193b0', fontSize:'0.85rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>Loading Resource…</p>
      </div>
    </div>
  )

  return (
    <div className="rbp-root">
      <RBPStyles />
      <div className="rbp-orb rbp-orb-1" />
      <div className="rbp-orb rbp-orb-2" />
      <div className="rbp-orb rbp-orb-3" />

      <UserSidebar isSidebarExpanded={isSidebarExpanded} onCollapse={() => setIsSidebarExpanded(false)} onExpand={() => setIsSidebarExpanded(true)} onItemNavigate={item => item.path && navigate(item.path)} onLogout={handleLogout} sidebarItems={sidebarItems} />

      <div className={`rbp-content-wrap ${isSidebarExpanded ? 'expanded' : ''}`}>
        <UserDashboardHeader onLogout={handleLogout} eyebrow={headerLabels.eyebrow} title="Resource Details" />

        <main className="rbp-main">

          <button className="rbp-back-btn" onClick={() => navigate('/dashboard/user/resources')}>
            ← Back to Catalog
          </button>

          {error && <div className="rbp-error-box">{error}</div>}

          {resource && (
            <div className="rbp-grid">

              {/* ── Left column ── */}
              <div className="rbp-left-col">

                <div className="rbp-card">
                  {resource.imageUrl ? (
                    <img src={resource.imageUrl} alt={resource.name} className="rbp-img" />
                  ) : (
                    <div className="rbp-img-placeholder">
                      <span style={{ fontSize:'2.8rem' }}>🏢</span>
                      <span className="rbp-img-label">Facility</span>
                    </div>
                  )}

                  <h1 className="rbp-res-name">{resource.name}</h1>
                  <p className="rbp-res-type">{formatResourceType(resource.type)}</p>

                  <div className="rbp-stats">
                    <div className="rbp-stat-row"><span className="rbp-stat-lbl">Location</span><span className="rbp-stat-val">{resource.location}</span></div>
                    <div className="rbp-stat-row"><span className="rbp-stat-lbl">Max Capacity</span><span className="rbp-stat-val">{resource.capacity} people</span></div>
                    <div className="rbp-stat-row" style={{ borderBottom:'none' }}><span className="rbp-stat-lbl">Status</span><span className={resource.status === 'ACTIVE' ? 'rbp-badge-on' : 'rbp-badge-off'}>{resource.status}</span></div>
                  </div>

                  <button className="rbp-cta-btn" onClick={() => setIsModalOpen(true)} disabled={resource.status === 'OUT_OF_SERVICE'}>
                    <span>📅</span> Request this Space
                  </button>
                </div>

                <div className="rbp-card">
                  <p className="rbp-sec-title">Upcoming Reservations</p>
                  <p className="rbp-sec-sub">Times already taken or awaiting approval.</p>

                  {takenBookings.length === 0 ? (
                    <div className="rbp-empty-state"><span style={{ fontSize:'1.8rem' }}>🌊</span><p>All clear — no upcoming bookings.</p></div>
                  ) : (
                    <div>
                      {takenBookings.map(b => (
                        <div key={b.id} className="rbp-res-item">
                          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                            <div className="rbp-day-badge">{b.startTime.split('T')[0].split('-')[2]}</div>
                            <div>
                              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'#1a6880', margin:0 }}>{b.startTime.split('T')[0]}</p>
                              <p style={{ fontSize:'0.68rem', fontWeight:700, color:'#2193b0', margin:0 }}>
                                {b.startTime.split('T')[1].substring(0,5)} – {b.endTime.split('T')[1].substring(0,5)}
                              </p>
                            </div>
                          </div>
                          {b.status === 'PENDING' && <span className="rbp-pending-pill">Pending</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right column: schedule ── */}
              <div>
                <div className="rbp-card">
                  
                  {/* 👇 NEW: Week Pagination Header 👇 */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'1.25rem' }}>
                    <div>
                      <p className="rbp-sec-title">Daily Availability</p>
                      <p className="rbp-sec-sub" style={{ marginBottom: 0 }}>Showing schedule for the selected 7 days.</p>
                    </div>
                    <div style={{ display:'flex', gap:'0.4rem' }}>
                      <button onClick={() => setWeekOffset(w => w - 1)} className="rbp-btn-small">← Prev</button>
                      <button onClick={() => setWeekOffset(0)} className="rbp-btn-small" disabled={weekOffset === 0}>Today</button>
                      <button onClick={() => setWeekOffset(w => w + 1)} className="rbp-btn-small">Next →</button>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:'1.5rem', marginBottom:'1.25rem' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.45rem' }}><div className="rbp-legend-on" /><span style={{ fontSize:'0.72rem', color:'#2193b0', fontWeight:700 }}>Available</span></div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.45rem' }}><div className="rbp-legend-taken" /><span style={{ fontSize:'0.72rem', color:'#d97706', fontWeight:700 }}>Booked</span></div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.45rem' }}><div className="rbp-legend-off" /><span style={{ fontSize:'0.72rem', color:'#8ec9d8', fontWeight:700 }}>Unavailable</span></div>
                  </div>

                  <div style={{ overflowX:'auto', paddingBottom:'0.5rem' }}>
                    <table style={{ borderCollapse:'separate', borderSpacing:'4px', width:'100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width:70 }} />
                          {HOURS.map(h => (
                            <th key={h} style={{ width:34, textAlign:'center', fontSize:'0.6rem', fontWeight:700, color:'#5ab4cb', paddingBottom:8, letterSpacing:'0.04em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayDates.map(dateObj => {
                          const daysMap = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                          const dayOfWeek = daysMap[dateObj.getDay()];
                          const dateString = formatLocalYYYYMMDD(dateObj);
                          const displayDay = DAY_SHORT[dayOfWeek];
                          const displayDateText = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })}`;

                          return (
                            <tr key={dateString}>
                              <td style={{ textAlign:'right', paddingRight:10, whiteSpace:'nowrap' }}>
                                {/* 👇 Enhanced exact-date row labels 👇 */}
                                <div style={{ fontSize:'0.65rem', fontWeight:800, color:'#1a6880', textTransform:'uppercase' }}>{displayDay}</div>
                                <div style={{ fontSize:'0.55rem', fontWeight:600, color:'#5ab4cb' }}>{displayDateText}</div>
                              </td>
                              {HOURS.map(hour => {
                                // Operating schedule relies on general day
                                const isActive = activeKeys.has(`${dayOfWeek}-${hour}`);
                                // Specific bookings rely on EXACT Date String!
                                const segments = takenDataMap.get(`${dateString}-${hour}`) || [];
                                
                                const baseClass = isActive ? 'rbp-cell-on' : 'rbp-cell-off';
                                const baseTitle = isActive ? `${displayDay}, ${displayDateText} ${hour}:00 — Available` : 'Not Available';

                                return (
                                  <td key={hour}>
                                    <div title={baseTitle} className={baseClass}>
                                      {segments.map((seg, i) => {
                                        const leftPercent = (seg.start / 60) * 100;
                                        const widthPercent = ((seg.end - seg.start) / 60) * 100;
                                        const segTitle = `Booked: ${seg.booking.startTime.split('T')[1].substring(0,5)} - ${seg.booking.endTime.split('T')[1].substring(0,5)}`;
                                        
                                        return (
                                          <div 
                                            key={i}
                                            title={segTitle}
                                            className="rbp-cell-booked-block"
                                            style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                                          />
                                        )
                                      })}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="rbp-grid-footer">
                    <span>Hours: 08:00 – 19:00</span>
                    <span>Hover over segments for details</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>

      <CreateBookingModal isOpen={isModalOpen} selectedResource={resource} activeKeys={activeKeys} onClose={() => setIsModalOpen(false)} onSuccess={() => setIsModalOpen(false)} />
    </div>
  )
}

function RBPStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

      .rbp-root { min-height: 100vh; background: linear-gradient(160deg, #e8fafe 0%, #caf4fb 30%, #b5edf8 60%, #d4f8fc 100%); font-family: 'Plus Jakarta Sans', sans-serif; color: #0a3d55; position: relative; overflow-x: hidden; }
      .rbp-orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; }
      .rbp-orb-1 { width: 520px; height: 520px; top: -160px; right: -100px; background: radial-gradient(circle, rgba(109,213,237,0.28) 0%, rgba(0,131,254,0.08) 55%, transparent 75%); animation: rbp-drift 12s ease-in-out infinite; }
      .rbp-orb-2 { width: 380px; height: 380px; bottom: -80px; left: -60px; background: radial-gradient(circle, rgba(139,222,218,0.25) 0%, rgba(67,173,208,0.08) 55%, transparent 75%); animation: rbp-drift 16s ease-in-out infinite reverse; }
      .rbp-orb-3 { width: 200px; height: 200px; top: 40%; left: 38%; background: radial-gradient(circle, rgba(0,255,240,0.07) 0%, transparent 70%); animation: rbp-drift 9s ease-in-out infinite; }
      @keyframes rbp-drift { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-20px) scale(1.05)} }

      .rbp-spinner { width: 56px; height: 56px; border-radius: 50%; border: 3px solid transparent; border-top-color: #0083fe; border-left-color: #2193b0; animation: rbp-spin 0.8s linear infinite; }
      .rbp-pulse-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #43add0; animation: rbp-pulse 1.4s ease-out infinite; }
      @keyframes rbp-spin  { to { transform: rotate(360deg) } }
      @keyframes rbp-pulse { 0%{transform:scale(0.85);opacity:1} 100%{transform:scale(1.5);opacity:0} }

      .rbp-content-wrap { min-height: 100vh; transition: padding-left 0.3s; padding-left: 5rem; position: relative; z-index: 1; }
      .rbp-content-wrap.expanded { padding-left: 16rem; }
      .rbp-main { max-width: 74rem; margin: 0 auto; padding: 2rem 1.5rem 6rem; }

      .rbp-back-btn { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #2193b0; background: rgba(255,255,255,0.75); border: 1px solid rgba(67,173,208,0.3); border-radius: 100px; padding: 0.45rem 1.1rem; cursor: pointer; margin-bottom: 1.75rem; box-shadow: 0 2px 10px rgba(33,147,176,0.1); transition: all 0.2s; }
      .rbp-back-btn:hover { background: #fff; border-color: #2193b0; color: #0083fe; transform: translateX(-3px); box-shadow: 0 4px 16px rgba(0,131,254,0.18); }
      
      /* 👇 NEW: Buttons for navigating weeks 👇 */
      .rbp-btn-small { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.3rem 0.8rem; font-size: 0.7rem; font-weight: 700; color: #1a6880; cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
      .rbp-btn-small:hover:not(:disabled) { background: #f0f9ff; color: #0083fe; border-color: #6dd5ed; transform: translateY(-1px); box-shadow: 0 2px 5px rgba(0,131,254,0.15); }
      .rbp-btn-small:disabled { opacity: 0.5; cursor: not-allowed; }

      .rbp-error-box { margin-bottom:1.5rem; border-radius:14px; background:rgba(254,226,226,0.85); border:1px solid rgba(239,68,68,0.25); padding:1rem 1.25rem; font-size:0.85rem; color:#991b1b; font-weight:600; }

      .rbp-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start; }
      .rbp-left-col { display: flex; flex-direction: column; gap: 1.25rem; }

      .rbp-card { background: rgba(255,255,255,0.7); border: 1px solid rgba(67,173,208,0.25); border-radius: 22px; backdrop-filter: blur(20px); box-shadow: 0 4px 24px rgba(33,147,176,0.1), 0 1px 0 rgba(255,255,255,0.95) inset; padding: 1.5rem; position: relative; overflow: hidden; }
      .rbp-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #0083fe, #2193b0, #43add0, #6dd5ed, #8bdeda, #00fff0, #6dd5ed, #43add0, #2193b0, #0083fe); background-size: 300%; animation: rbp-rainbow 5s linear infinite; }
      @keyframes rbp-rainbow { 0%{background-position:0%} 100%{background-position:300%} }

      .rbp-img { width:100%; height:175px; object-fit:cover; border-radius:14px; margin-bottom:1.25rem; }
      .rbp-img-placeholder { width:100%; height:175px; border-radius:14px; margin-bottom:1.25rem; background: linear-gradient(135deg, rgba(0,131,254,0.07), rgba(109,213,237,0.15), rgba(139,222,218,0.1)); border: 1px solid rgba(67,173,208,0.2); display: flex; flex-direction:column; align-items:center; justify-content:center; gap:0.4rem; }
      .rbp-img-label { font-size:0.65rem; font-weight:700; color:#43add0; letter-spacing:0.12em; text-transform:uppercase; }

      .rbp-res-name { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; margin: 0; background: linear-gradient(135deg, #0056b8 0%, #2193b0 50%, #43add0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
      .rbp-res-type { font-size:0.68rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#43add0; margin-top:0.3rem; }

      .rbp-stats { margin-top:1.25rem; }
      .rbp-stat-row { display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid rgba(67,173,208,0.12); }
      .rbp-stat-lbl { font-size:0.65rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#7ec8da; }
      .rbp-stat-val { font-size:0.84rem; font-weight:700; color:#1a6070; }
      .rbp-badge-on { font-size:0.63rem; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:#065f46; background:linear-gradient(135deg,#d1fae5,#a7f3d0); border:1px solid rgba(16,185,129,0.3); border-radius:100px; padding:0.22rem 0.8rem; }
      .rbp-badge-off { font-size:0.63rem; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:#991b1b; background:#fee2e2; border:1px solid rgba(239,68,68,0.3); border-radius:100px; padding:0.22rem 0.8rem; }

      .rbp-cta-btn { width:100%; margin-top:1.5rem; background: linear-gradient(135deg, #0083fe 0%, #2193b0 40%, #43add0 80%, #6dd5ed 100%); background-size: 200%; color:#fff; font-size:0.9rem; font-weight:800; letter-spacing:0.03em; padding:0.95rem; border-radius:14px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.6rem; box-shadow: 0 8px 28px rgba(0,131,254,0.3), 0 1px 0 rgba(255,255,255,0.35) inset; transition: all 0.3s; position:relative; overflow:hidden; }
      .rbp-cta-btn::after { content:''; position:absolute; inset:0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent); transform: translateX(-120%); transition: transform 0.55s; }
      .rbp-cta-btn:hover::after { transform:translateX(120%); }
      .rbp-cta-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 14px 38px rgba(0,131,254,0.42); }
      .rbp-cta-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

      .rbp-sec-title { font-size:1.05rem; font-weight:800; letter-spacing:-0.01em; margin:0; background:linear-gradient(135deg,#0056b8,#2193b0); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .rbp-sec-sub { font-size:0.77rem; color:#5ab4cb; margin-top:0.25rem; font-weight:500; }

      .rbp-empty-state { text-align:center; padding:1.4rem 1rem; background:linear-gradient(135deg,rgba(109,213,237,0.08),rgba(139,222,218,0.06)); border:1px dashed rgba(67,173,208,0.3); border-radius:14px; }
      .rbp-empty-state p { font-size:0.78rem; font-weight:700; color:#43add0; margin:0.4rem 0 0; }

      .rbp-res-item { display:flex; justify-content:space-between; align-items:center; padding:0.7rem 0.9rem; background:linear-gradient(135deg,rgba(109,213,237,0.1),rgba(139,222,218,0.07)); border:1px solid rgba(67,173,208,0.2); border-radius:12px; margin-bottom:0.55rem; transition:all 0.2s; }
      .rbp-res-item:hover { background:linear-gradient(135deg,rgba(109,213,237,0.18),rgba(139,222,218,0.13)); border-color:rgba(67,173,208,0.38); transform:translateX(3px); }
      .rbp-day-badge { width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg,#0083fe,#6dd5ed); display:flex; align-items:center; justify-content:center; font-size:0.82rem; font-weight:800; color:#fff; box-shadow:0 4px 12px rgba(0,131,254,0.28); flex-shrink:0; }
      .rbp-pending-pill { font-size:0.6rem; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:#92400e; background:linear-gradient(135deg,#fef3c7,#fde68a); border:1px solid rgba(251,191,36,0.4); border-radius:100px; padding:0.2rem 0.65rem; white-space:nowrap; }

      .rbp-cell-on { position:relative; overflow:hidden; height:30px; border-radius:6px; background:linear-gradient(135deg,#0083fe,#2193b0,#6dd5ed); box-shadow:0 2px 8px rgba(0,131,254,0.28); transition:transform 0.15s,box-shadow 0.15s; cursor:pointer;}
      .rbp-cell-on:hover { transform:scaleY(1.2); box-shadow:0 4px 16px rgba(0,131,254,0.48); z-index:10; }
      .rbp-cell-off { position:relative; overflow:hidden; height:30px; border-radius:6px; background:rgba(67,173,208,0.07); border:1px solid rgba(67,173,208,0.1); }
      
      .rbp-cell-booked-block { position: absolute; top:0; bottom:0; background: linear-gradient(135deg,#f59e0b,#fbbf24); box-shadow:0 2px 8px rgba(245,158,11,0.4); opacity: 0.95; border-radius: 4px; z-index: 2; transition: filter 0.2s; }
      .rbp-cell-booked-block:hover { filter: brightness(1.1); z-index: 15; }

      .rbp-legend-on { width:14px; height:14px; border-radius:4px; background:linear-gradient(135deg,#0083fe,#6dd5ed); box-shadow:0 2px 6px rgba(0,131,254,0.32); }
      .rbp-legend-off { width:14px; height:14px; border-radius:4px; background:rgba(67,173,208,0.1); border:1px solid rgba(67,173,208,0.2); }
      .rbp-legend-taken { width:14px; height:14px; border-radius:4px; background:linear-gradient(135deg,#f59e0b,#fbbf24); box-shadow:0 2px 6px rgba(245,158,11,0.32); }

      .rbp-grid-footer { margin-top:1.25rem; padding-top:0.9rem; border-top:1px solid rgba(67,173,208,0.15); display:flex; justify-content:space-between; }
      .rbp-grid-footer span { font-size:0.68rem; color:#8ec9d8; font-weight:600; }
    `}</style>
  )
}