import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../../context/useAuth';
import { getAllResources, getAvailabilitySlots, formatResourceType } from '../../../api/resourceApi';
import { getAllBookings } from '../../../api/bookingApi';
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants';
import UserDashboardHeader from './components/UserDashboardHeader';
import UserSidebar from './components/UserSidebar';
import CreateBookingModal from './components/CreateBookingModal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

const DAY_SHORT = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' };
const HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];

function formatLocalYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [resource, setResource] = useState(null);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const modifyData = location.state?.modifyBooking || null;

  useEffect(() => {
    if (modifyData && resource && !isModalOpen) {
      setIsModalOpen(true);
    }
  }, [modifyData, resource, isModalOpen]);

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

  const handleLogout = () => { logout(); navigate('/signin', { replace: true }); };

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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Loading Facility Details…</p>
      </div>
    </div>
  );

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
        <UserDashboardHeader onLogout={handleLogout} eyebrow={headerLabels.eyebrow} title="Resource Details" />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
          
          <button 
            onClick={() => navigate('/dashboard/user/resources')}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest mb-6"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Catalog
          </button>

          {error && (
            <div className="mb-8 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {error}
            </div>
          )}

          {resource && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Left Sidebar: Info */}
              <div className="lg:col-span-4 space-y-6">
                <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 overflow-hidden">
                  {resource.imageUrl ? (
                    <img src={resource.imageUrl} alt={resource.name} className="w-full h-48 object-cover rounded-2xl mb-6 shadow-md border border-slate-100" />
                  ) : (
                    <div className="w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl mb-6 flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-slate-300 text-5xl">domain</span>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory # {resource.id}</p>
                    </div>
                  )}

                  <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">{resource.name}</h1>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-6">{formatResourceType(resource.type)}</p>

                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-400 uppercase tracking-tighter text-[10px]">Location</span>
                      <span className="font-bold text-slate-900">{resource.location}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-400 uppercase tracking-tighter text-[10px]">Capacity</span>
                      <span className="font-bold text-slate-900">{resource.capacity} PAX</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-400 uppercase tracking-tighter text-[10px]">Current Status</span>
                      <Badge status={resource.status} />
                    </div>
                  </div>

                  <Button
                    className="w-full mt-8 shadow-xl shadow-indigo-600/20"
                    onClick={() => setIsModalOpen(true)}
                    disabled={resource.status === 'OUT_OF_SERVICE'}
                  >
                    <span className="material-symbols-outlined mr-2 text-[20px]">calendar_add_on</span>
                    {modifyData ? 'Request Change' : 'Reserve Now'}
                  </Button>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-6">Confirmed Schedules</h4>
                  
                  <div className="relative mb-6">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-[18px]">search</span>
                    <input 
                      type="text" 
                      placeholder="Filter by date..." 
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    {filteredBookings.length === 0 ? (
                      <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                        <span className="material-symbols-outlined text-slate-300 text-3xl mb-2">event_busy</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No activity found</p>
                      </div>
                    ) : (
                      filteredBookings.slice(0, 5).map(b => (
                        <div key={b.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-transparent hover:border-indigo-100 hover:bg-white transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-600/10">
                              {b.startTime.split('T')[0].split('-')[2]}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-900 leading-none mb-1">{b.startTime.split('T')[0]}</p>
                              <p className="text-[10px] font-bold text-slate-400">{b.startTime.split('T')[1].substring(0, 5)} - {b.endTime.split('T')[1].substring(0, 5)}</p>
                            </div>
                          </div>
                          {b.status === 'PENDING' && (
                            <span className="text-[8px] font-black uppercase tracking-tighter px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">Wait</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel: Availability Grid */}
              <div className="lg:col-span-8">
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100 h-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-2 text-center sm:text-left">Availability Grid</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center sm:text-left">Weekly Operational View</p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setWeekOffset(w => w - 1)} className="h-10 w-10 rounded-xl border border-slate-100 hover:bg-slate-50 transition text-slate-400">
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <button onClick={() => setWeekOffset(0)} className="px-4 h-10 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-indigo-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed" disabled={weekOffset === 0}>
                        Today
                      </button>
                      <button onClick={() => setWeekOffset(w => w + 1)} className="h-10 w-10 rounded-xl border border-slate-100 hover:bg-slate-50 transition text-slate-400">
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mb-8 justify-center sm:justify-start">
                    <LegendItem color="bg-indigo-500" label="Available" />
                    <LegendItem color="bg-amber-500" label="Booked" />
                    <LegendItem color="bg-slate-100" label="Closed" />
                  </div>

                  <div className="overflow-x-auto no-scrollbar pb-4">
                    <table className="w-full border-separate border-spacing-1.5 min-w-[600px]">
                      <thead>
                        <tr>
                          <th className="w-16" />
                          {HOURS.map(h => (
                            <th key={h} className="text-center pb-4 text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
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
                              <td className="pr-4 text-right">
                                <p className="text-[11px] font-black text-slate-900 uppercase leading-none mb-0.5">{displayDay}</p>
                                <p className="text-[10px] font-bold text-slate-300 whitespace-nowrap">{displayDate}</p>
                              </td>
                              {HOURS.map(hour => {
                                const isActive = activeKeys.has(`${dayOfWeek}-${hour}`);
                                const segments = takenDataMap.get(`${dateString}-${hour}`) || [];
                                
                                return (
                                  <td key={hour}>
                                    <div className={`relative h-10 rounded-xl transition-all cursor-pointer overflow-hidden border ${isActive ? 'bg-indigo-500 border-indigo-400 shadow-sm hover:shadow-md hover:scale-105 group' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                      {segments.map((seg, i) => (
                                        <div
                                          key={i}
                                          className="absolute inset-y-0 bg-amber-500 border-x border-amber-600/20 z-10 shadow-sm transition-colors hover:bg-amber-400"
                                          style={{
                                            left:  `${(seg.start / 60) * 100}%`,
                                            width: `${((seg.end - seg.start) / 60) * 100}%`,
                                          }}
                                          title={`Booked: ${seg.booking.startTime.split('T')[1].substring(0, 5)} - ${seg.booking.endTime.split('T')[1].substring(0, 5)}`}
                                        />
                                      ))}
                                      {isActive && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                          <span className="text-[10px] text-white font-black uppercase">Free</span>
                                        </div>
                                      )}
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

                  <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <p>Operating Window: 08:00 — 19:00</p>
                    <p className="text-indigo-500">Selection automatically handles conflicts</p>
                  </div>
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

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}