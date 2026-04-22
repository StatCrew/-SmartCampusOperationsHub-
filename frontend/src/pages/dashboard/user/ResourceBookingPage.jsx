import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../../context/useAuth';
import { getAllResources, getAvailabilitySlots, formatResourceType } from '../../../api/resourceApi';
import { getAllBookings } from '../../../api/bookingApi';
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants';
import UserDashboardHeader from './components/UserDashboardHeader';
import UserSidebar from './components/UserSidebar';
import CreateBookingModal from './components/CreateBookingModal';

const DAY_SHORT = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' };
const HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];

/**
 * Formats a given Date object to a localized YYYY-MM-DD string format.
 * This ensures strict adherence to the local calendar day, preventing 
 * date-shifting bugs caused by implicit UTC conversions.
 * * @param {Date} date - The date object to format.
 * @returns {string} The formatted date string (e.g., "2026-04-28").
 */
function formatLocalYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Maps raw availability timeslots into a localized Set of string keys.
 * This allows O(1) time complexity lookups when rendering the availability grid.
 * * @param {Array} slots - The array of resource availability slots.
 * @returns {Set<string>} A set containing operational hour keys (e.g., "MONDAY-08").
 */
function extractAvailabilityKeys(slots) {
  const keys = new Set();
  slots.forEach(s => {
    const startHour = parseInt(s.startTime.split(':')[0], 10);
    let endHour = parseInt(s.endTime.split(':')[0], 10);
    const endMin = parseInt(s.endTime.split(':')[1], 10);
    
    if (endMin === 0 && endHour > startHour) endHour -= 1;
    
    for (let h = startHour; h <= endHour; h++) {
      keys.add(`${s.dayOfWeek}-${String(h).padStart(2, '0')}`);
    }
  });
  return keys;
}

/**
 * Normalizes existing bookings into a Map segregated by specific Date and Hour.
 * Enables the UI to calculate and render exact partial-hour blocks dynamically.
 * * @param {Array} bookings - The array of existing booking entities.
 * @returns {Map<string, Array>} A mapping of specific datetime keys to booking segments.
 */
function mapBookingsToGrid(bookings) {
  const takenMap = new Map();
  
  bookings.forEach(b => {
    const dateString = b.startTime.split('T')[0];
    const startT = b.startTime.split('T')[1].split(':');
    const endT = b.endTime.split('T')[1].split(':');
    
    const startHour = parseInt(startT[0], 10);
    const startMin  = parseInt(startT[1], 10);
    const endHour   = parseInt(endT[0], 10);
    const endMin    = parseInt(endT[1], 10);

    for (let h = startHour; h <= endHour; h++) {
      if (h === endHour && endMin === 0) break;
      
      const key = `${dateString}-${String(h).padStart(2, '0')}`;
      const sMin = h === startHour ? startMin : 0;
      const eMin = h === endHour ? endMin : 60;
      
      if (!takenMap.has(key)) takenMap.set(key, []);
      takenMap.get(key).push({ start: sMin, end: eMin, booking: b });
    }
  });
  return takenMap;
}

export default function ResourceBookingPage() {
  const { id } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { role, logout, getApiErrorMessage } = useAuth();

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [resource, setResource] = useState(null);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const modifyData = location.state?.modifyBooking || null;

  /**
   * Automatically initializes the booking modal if the user is redirected
   * here from an existing reservation modification flow.
   */
  useEffect(() => {
    if (modifyData && resource && !isModalOpen) {
      setIsModalOpen(true);
    }
  }, [modifyData, resource, isModalOpen]);

  /**
   * Fetches core resource details, operating hours, and associated bookings.
   * Performs client-side date filtering to ignore historical records.
   */
  const loadResourceData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const allResources = await getAllResources();
      const current = allResources.find(r => String(r.id) === String(id));
      if (!current) throw new Error('Resource not found.');
      setResource(current);

      const slots = await getAvailabilitySlots(id);
      setActiveKeys(extractAvailabilityKeys(slots));

      const bookingsResponse = await getAllBookings({ size: 1000 });
      const bookings = bookingsResponse?.content || bookingsResponse || [];

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const relevantBookings = bookings.filter(b =>
        String(b.resourceId) === String(id) &&
        (b.status === 'APPROVED' || b.status === 'PENDING') &&
        new Date(b.startTime) >= startOfToday
      ).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      setUpcomingBookings(relevantBookings);
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Failed to load resource details.');
    } finally {
      setLoading(false);
    }
  }, [id, getApiErrorMessage]);

  useEffect(() => { 
    if (!isModalOpen) loadResourceData(); 
  }, [loadResourceData, isModalOpen]);

  const handleLogout = () => { 
    logout(); 
    navigate('/signin', { replace: true }); 
  };

  const sidebarItems = useMemo(() => 
    getSidebarItemsByRole(role).map(item => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role]
  );
  
  const headerLabels = getHeaderLabelsByRole(role);
  const takenDataMap = useMemo(() => mapBookingsToGrid(upcomingBookings), [upcomingBookings]);

  const filteredBookings = useMemo(() => {
    if (!searchQuery) return upcomingBookings;
    const lowerQuery = searchQuery.toLowerCase();
    return upcomingBookings.filter(b => 
      b.startTime.toLowerCase().includes(lowerQuery) || 
      (b.purpose && b.purpose.toLowerCase().includes(lowerQuery))
    );
  }, [upcomingBookings, searchQuery]);

  /**
   * Generates sequential Date objects dynamically calculated from the 
   * user's current pagination offset.
   */
  const displayDates = useMemo(() => {
    const dates = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + weekOffset * 7);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekOffset]);

  if (loading && !resource) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Poppins', sans-serif" }}>
      <PageStyles />
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, margin: '0 auto 1rem', border: '3px solid #e0e7ff', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#4f46e5', fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Loading Resource…</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Poppins', sans-serif", color: '#0f172a' }}>
      <PageStyles />

      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={item => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div style={{ minHeight: '100vh', transition: 'padding-left 0.3s', paddingLeft: isSidebarExpanded ? 256 : 80 }}>
        <UserDashboardHeader onLogout={handleLogout} eyebrow={headerLabels.eyebrow} title="Resource Details" />

        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>

          <button className="back-btn" onClick={() => navigate('/dashboard/user/resources')}>
            ← Back to Catalog
          </button>

          {error && (
            <div className="error-banner">
              <span>⚠️</span> {error}
            </div>
          )}

          {resource && (
            <div className="page-grid">

              {/* Resource Profile Context Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div className="card">
                  {resource.imageUrl ? (
                    <img src={resource.imageUrl} alt={resource.name} className="resource-img" />
                  ) : (
                    <div className="resource-img-placeholder">
                      <span style={{ fontSize: '2.5rem', opacity: 0.3 }}>🏢</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', marginTop: 4 }}>No Image</span>
                    </div>
                  )}

                  <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0', letterSpacing: '-0.01em' }}>
                    {resource.name}
                  </h1>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', margin: '0.2rem 0 0 0' }}>
                    {formatResourceType(resource.type)}
                  </p>

                  <div style={{ marginTop: '1.5rem' }}>
                    {[
                      { label: 'Location', value: resource.location },
                      { label: 'Capacity', value: `${resource.capacity} people` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{label}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{value}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Status</span>
                      <span className={resource.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}>
                        {resource.status}
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn-primary w-full mt-6"
                    onClick={() => setIsModalOpen(true)}
                    disabled={resource.status === 'OUT_OF_SERVICE'}
                  >
                    <span>📅</span> Request this Space
                  </button>
                </div>

                <div className="card">
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>Upcoming Bookings</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0' }}>Approved and pending schedules.</p>
                  </div>

                  <div className="search-input-wrapper" style={{ maxWidth: '100%', marginBottom: '1rem' }}>
                    <span className="search-icon">🔍</span>
                    <input 
                      type="text" 
                      placeholder="Search by date (e.g. 2026-04)..." 
                      className="search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {filteredBookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 8 }}>
                      <div style={{ fontSize: '1.5rem', opacity: 0.5, marginBottom: 4 }}>🗓️</div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b', margin: 0 }}>
                        {searchQuery ? 'No matching bookings found.' : 'No upcoming bookings.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {filteredBookings.map(b => (
                        <div key={b.id} className="reservation-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="day-badge">
                              {b.startTime.split('T')[0].split('-')[2]}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                                {b.startTime.split('T')[0]}
                              </p>
                              <p style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b', margin: 0 }}>
                                {b.startTime.split('T')[1].substring(0, 5)} – {b.endTime.split('T')[1].substring(0, 5)}
                              </p>
                            </div>
                          </div>
                          {b.status === 'PENDING' && (
                            <span className="pending-pill">Pending</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Resource Master Schedule Grid */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>Daily Availability</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Schedule for the selected week.</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {[
                      { label: '← Prev', action: () => setWeekOffset(w => w - 1), disabled: false },
                      { label: 'Today',  action: () => setWeekOffset(0), disabled: weekOffset === 0 },
                      { label: 'Next →', action: () => setWeekOffset(w => w + 1), disabled: false },
                    ].map(({ label, action, disabled }) => (
                      <button key={label} className="nav-btn" onClick={action} disabled={disabled}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <LegendItem color="#2193b0" label="Available" borderColor="#1a7a93" />
                  <LegendItem color="#f59e0b" label="Booked" />
                  <LegendItem color="#f1f5f9" label="Unavailable" borderColor="#cbd5e1" />
                </div>

                <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: '4px', width: '100%', minWidth: '600px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 80 }} />
                        {HOURS.map(h => (
                          <th key={h} style={{ width: 36, textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', paddingBottom: 8 }}>
                            {h}:00
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayDates.map(dateObj => {
                        const daysMap = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                        const dayOfWeek  = daysMap[dateObj.getDay()];
                        const dateString = formatLocalYYYYMMDD(dateObj);
                        const displayDay = DAY_SHORT[dayOfWeek];
                        const displayDate = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })}`;

                        return (
                          <tr key={dateString}>
                            <td style={{ textAlign: 'right', paddingRight: 12, whiteSpace: 'nowrap' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>{displayDay}</div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 500, color: '#64748b' }}>{displayDate}</div>
                            </td>
                            {HOURS.map(hour => {
                              const isActive = activeKeys.has(`${dayOfWeek}-${hour}`);
                              const segments = takenDataMap.get(`${dateString}-${hour}`) || [];
                              const title = isActive
                                ? `${displayDay}, ${displayDate} ${hour}:00 — Available`
                                : 'Not Available';

                              return (
                                <td key={hour}>
                                  <div
                                    title={title}
                                    className={isActive ? 'cell-available' : 'cell-unavailable'}
                                  >
                                    {segments.map((seg, i) => (
                                      <div
                                        key={i}
                                        className="cell-booked-block"
                                        title={`Booked: ${seg.booking.startTime.split('T')[1].substring(0, 5)} – ${seg.booking.endTime.split('T')[1].substring(0, 5)}`}
                                        style={{
                                          left:  `${(seg.start / 60) * 100}%`,
                                          width: `${((seg.end - seg.start) / 60) * 100}%`,
                                        }}
                                      />
                                    ))}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>Operational Hours: 08:00 – 19:00</span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>Hover cells for details</span>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>

      <CreateBookingModal
        isOpen={isModalOpen}
        selectedResource={resource}
        activeKeys={activeKeys}
        modifyData={modifyData}
        onClose={() => {
          setIsModalOpen(false);
          if (modifyData) navigate('/dashboard/user/bookings');
          else navigate(location.pathname, { replace: true, state: {} });
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          if (modifyData) navigate('/dashboard/user/bookings');
          else {
            navigate(location.pathname, { replace: true, state: {} });
            loadResourceData();
          }
        }}
      />
    </div>
  );
}

function LegendItem({ color, label, borderColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        width: 14, height: 14, borderRadius: 4,
        background: color,
        border: borderColor ? `1px solid ${borderColor}` : 'none',
      }} />
      <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function PageStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      @keyframes spin { to { transform: rotate(360deg) } }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }

      /* Structural Layout */
      .page-grid {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 1.5rem;
        align-items: start;
        animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) both;
      }
      @media (max-width: 960px) {
        .page-grid { grid-template-columns: 1fr; }
      }

      .card {
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        padding: 1.5rem;
      }

      /* Base Buttons */
      .back-btn {
        display: inline-flex; align-items: center; gap: 0.5rem;
        font-size: 0.8125rem; font-weight: 500; font-family: 'Poppins', sans-serif;
        color: #475569; background: transparent; border: none; cursor: pointer;
        margin-bottom: 1.5rem; transition: color 0.2s;
      }
      .back-btn:hover { color: #0f172a; }

      .btn-primary {
        background: #4f46e5; color: #ffffff; border: none; cursor: pointer;
        font-family: 'Poppins', sans-serif; font-size: 0.875rem; font-weight: 600;
        padding: 0.65rem 1.5rem; border-radius: 8px; transition: all 0.2s ease;
        display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
        box-shadow: 0 2px 4px rgba(79, 70, 229, 0.15);
      }
      .btn-primary:hover:not(:disabled) { background: #4338ca; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25); transform: translateY(-1px); }
      .btn-primary:active { transform: translateY(0); }
      .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

      .nav-btn {
        background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px;
        padding: 0.35rem 0.75rem; font-size: 0.75rem; font-weight: 500;
        font-family: 'Poppins', sans-serif; color: #374151; cursor: pointer; transition: all 0.2s;
      }
      .nav-btn:hover:not(:disabled) { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }
      .nav-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      
      .w-full { width: 100%; }
      .mt-6 { margin-top: 1.5rem; }

      /* Resource Visuals */
      .resource-img { width: 100%; height: 180px; object-fit: cover; border-radius: 8px; margin-bottom: 1.25rem; border: 1px solid #e2e8f0; }
      .resource-img-placeholder {
        width: 100%; height: 180px; border-radius: 8px; margin-bottom: 1.25rem;
        background: #f8fafc; border: 1px dashed #cbd5e1;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
      }

      /* Indicators and Badges */
      .badge-active { font-size: 0.7rem; font-weight: 600; color: #059669; background: #d1fae5; padding: 0.2rem 0.6rem; border-radius: 100px; }
      .badge-inactive { font-size: 0.7rem; font-weight: 600; color: #dc2626; background: #fee2e2; padding: 0.2rem 0.6rem; border-radius: 100px; }
      .day-badge { width: 38px; height: 38px; border-radius: 8px; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 600; color: #ffffff; flex-shrink: 0; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2); }
      .pending-pill { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: #d97706; background: #fef3c7; border-radius: 100px; padding: 0.2rem 0.6rem; border: 1px solid #fcd34d; }

      /* Interactive Filters */
      .search-input-wrapper { position: relative; width: 100%; }
      .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.9rem; }
      .search-input {
        width: 100%; padding: 0.5rem 1rem 0.5rem 2.25rem; border-radius: 6px;
        border: 1px solid #e2e8f0; font-family: 'Poppins', sans-serif; font-size: 0.8125rem;
        color: #1e293b; outline: none; transition: all 0.2s; box-sizing: border-box; background: #f8fafc;
      }
      .search-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); background: #ffffff; }

      /* Content Lists */
      .reservation-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; transition: background 0.15s; }
      .reservation-item:hover { background: #f8fafc; }

      .error-banner { border-radius: 8px; background: #fef2f2; border: 1px solid #fecaca; padding: 0.875rem 1.25rem; font-size: 0.875rem; color: #b91c1c; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }

      /* Visual Grid Elements */
      .cell-available { 
        position: relative; overflow: hidden; height: 32px; border-radius: 4px; 
        background: #2193b0; border: 1px solid #1a7a93; 
        transition: all 0.15s; cursor: pointer; box-shadow: 0 1px 2px rgba(33, 147, 176, 0.1); 
      }
      .cell-available:hover { 
        background: #1a7a93; box-shadow: 0 4px 8px rgba(33, 147, 176, 0.25); 
        transform: translateY(-1px); z-index: 5; 
      }
      
      .cell-unavailable { position: relative; overflow: hidden; height: 32px; border-radius: 4px; background: #f1f5f9; border: 1px solid #e2e8f0; }
      
      .cell-booked-block { position: absolute; top: -1px; bottom: -1px; background: #f59e0b; border-radius: 3px; z-index: 2; border: 1px solid #d97706; transition: background 0.15s; }
      .cell-booked-block:hover { background: #d97706; z-index: 10; }
    `}</style>
  );
}