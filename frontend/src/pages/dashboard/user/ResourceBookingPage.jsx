import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import useAuth from '../../../context/useAuth'
import { getAllResources, getAvailabilitySlots, formatResourceType } from '../../../api/resourceApi'
import { getAllBookings } from '../../../api/bookingApi'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'
import CreateBookingModal from './components/CreateBookingModal'

// ─── Schedule grid constants ───
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const DAY_SHORT = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' }
const HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19']

function slotsToKeys(slots) {
  const keys = new Set()
  slots.forEach(s => {
    const hour = s.startTime.slice(0, 2)
    if (HOURS.includes(hour)) keys.add(`${s.dayOfWeek}-${hour}`)
  })
  return keys
}

export default function ResourceBookingPage() {
  const { id } = useParams() // Gets the resource ID from the URL
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

  // 1. Fetch all data when page loads
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Fetch the specific resource
      const allResources = await getAllResources()
      const currentResource = allResources.find(r => String(r.id) === String(id))
      
      if (!currentResource) {
        throw new Error('Resource not found.')
      }
      setResource(currentResource)

      // Fetch base weekly schedule
      const slots = await getAvailabilitySlots(id)
      setActiveKeys(slotsToKeys(slots))

      // Fetch actual upcoming bookings to show what is taken
      const bookingsResponse = await getAllBookings({ resourceId: id, size: 100 })
      const bookings = bookingsResponse?.content || bookingsResponse || []
      
      // 🌟 FIX: Get the start of today (Midnight) so today's bookings don't vanish!
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      // Filter for future/today, approved/pending bookings for THIS resource
      const upcomingTaken = bookings.filter(b => 
        String(b.resourceId) === String(id) && 
        (b.status === 'APPROVED' || b.status === 'PENDING') &&
        new Date(b.startTime) >= startOfToday
      ).sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

      setTakenBookings(upcomingTaken)

    } catch (err) {
      setError(getApiErrorMessage(err) || 'Failed to load resource details.')
    } finally {
      setLoading(false)
    }
  }, [id, getApiErrorMessage])

  // Reload data when the page opens or when the modal closes (so new bookings appear instantly)
  useEffect(() => { 
    if (!isModalOpen) {
      loadData() 
    }
  }, [loadData, isModalOpen])

  const handleLogout = () => { logout(); navigate('/signin', { replace: true }) }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role]
  )
  const headerLabels = getHeaderLabelsByRole(role)

  if (loading && !resource) return <div className="min-h-screen bg-slate-100 p-10 text-center font-bold text-slate-500">Loading Resource Details...</div>

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={(item) => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader onLogout={handleLogout} eyebrow={headerLabels.eyebrow} title="Resource Details" />

        <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
          
          {/* Back Button */}
          <button onClick={() => navigate('/dashboard/user/resources')} className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition">
            <span>←</span> Back to Catalog
          </button>

          {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {resource && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Resource Info & Action */}
              <div className="lg:col-span-1 space-y-6">
                
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500" />
                  {resource.imageUrl ? (
                    <img src={resource.imageUrl} alt={resource.name} className="w-full h-48 object-cover rounded-xl mb-6 shadow-inner" />
                  ) : (
                    <div className="w-full h-48 bg-slate-100 rounded-xl mb-6 flex items-center justify-center border border-slate-200">
                      <span className="text-4xl">🏢</span>
                    </div>
                  )}
                  
                  <h1 className="text-2xl font-black text-slate-900">{resource.name}</h1>
                  <p className="text-sm text-slate-500 mt-1">{formatResourceType(resource.type)}</p>

                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs font-bold uppercase text-slate-400">Location</span>
                      <span className="text-sm font-semibold text-slate-700">{resource.location}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs font-bold uppercase text-slate-400">Max Capacity</span>
                      <span className="text-sm font-semibold text-slate-700">{resource.capacity} People</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs font-bold uppercase text-slate-400">Status</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${resource.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {resource.status}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsModalOpen(true)}
                    disabled={resource.status === 'OUT_OF_SERVICE'}
                    className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>📅</span> Request this Space
                  </button>
                </div>

                {/* Upcoming Taken Slots List */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 mb-4">Upcoming Reservations</h3>
                  <p className="text-xs text-slate-500 mb-4">These specific times are already taken or pending.</p>
                  
                  {takenBookings.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-lg">✨</span>
                      <p className="text-xs font-semibold text-slate-500 mt-2">Wide open! No upcoming bookings.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {takenBookings.map(b => (
                        <div key={b.id} className="flex justify-between items-center p-3 bg-amber-50 border border-amber-100 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center text-xs font-bold text-amber-600 shadow-sm">
                              {b.startTime.split('T')[0].split('-')[2]} {/* Gets the day number */}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{b.startTime.split('T')[0]}</p>
                              <p className="text-[10px] font-semibold text-amber-700 uppercase">
                                {b.startTime.split('T')[1].substring(0,5)} - {b.endTime.split('T')[1].substring(0,5)}
                              </p>
                            </div>
                          </div>
                          {b.status === 'PENDING' && <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Weekly Schedule Grid */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h2 className="text-xl font-black text-slate-900">Standard Weekly Schedule</h2>
                  <p className="text-sm text-slate-500 mt-1 mb-6">Green slots indicate this resource's standard operating hours.</p>

                  {/* Schedule Grid */}
                  <div className="overflow-x-auto pb-4">
                    <table className="border-separate border-spacing-1.5 w-full">
                      <thead>
                        <tr>
                          <th className="w-16" />
                          {HOURS.map(h => (
                            <th key={h} className="w-10 text-center text-xs font-bold text-slate-400 pb-2">{h}:00</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map(day => (
                          <tr key={day}>
                            <td className="pr-4 text-right text-xs font-bold text-slate-500">{DAY_SHORT[day]}</td>
                            {HOURS.map(hour => {
                              const active = activeKeys.has(`${day}-${hour}`)
                              return (
                                <td key={hour}>
                                  <div
                                    title={active ? `${DAY_SHORT[day]} ${hour}:00 Available` : 'Not Available'}
                                    className={`h-8 w-full rounded-md transition ${active ? 'bg-emerald-400 shadow-sm' : 'bg-slate-100 border border-slate-200 opacity-50'}`}
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Booking Modal */}
      <CreateBookingModal 
        isOpen={isModalOpen} 
        selectedResource={resource} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => navigate('/dashboard/user/bookings')} 
      />
    </div>
  )
}