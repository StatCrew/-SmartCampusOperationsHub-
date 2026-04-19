import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'

import useTickets from "./hooks/useTickets";
import TicketDetailsModal from "./components/TicketDetailsModal";
import CreateTicketModal from "./components/CreateTicketModal";

// ── Priority & Status Config ──────────────────────────────────────
const PRIORITY_CONFIG = {
  HIGH: { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.25)', dot: '#dc2626', label: 'High' },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', dot: '#f59e0b', label: 'Medium' },
  LOW: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', dot: '#10b981', label: 'Low' },
}

const STATUS_CONFIG = {
  OPEN: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', dot: '#3b82f6', label: 'Open' },
  IN_PROGRESS: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', dot: '#f59e0b', label: 'In Progress' },
  RESOLVED: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', dot: '#10b981', label: 'Resolved' },
  CLOSED: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)', dot: '#6b7280', label: 'Closed' },
}

const getPriority = (p) => PRIORITY_CONFIG[p] || PRIORITY_CONFIG.LOW
const getStatus = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.OPEN

const formatDate = (iso) => {
  if (!iso) return 'N/A'
  const [date] = iso.split('T')
  return date
}

// ── Skeleton Card ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', border: '1px solid #b2ddd7', marginBottom: '1rem' }}>
      <div style={{ height: 16, borderRadius: 8, background: 'linear-gradient(90deg,#e8f5f3 25%,#d0eeea 50%,#e8f5f3 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', width: '40%', marginBottom: '0.75rem' }} />
      <div style={{ height: 16, borderRadius: 8, background: 'linear-gradient(90deg,#e8f5f3 25%,#d0eeea 50%,#e8f5f3 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', width: '70%', marginBottom: '0.75rem' }} />
      <div style={{ height: 16, borderRadius: 8, background: 'linear-gradient(90deg,#e8f5f3 25%,#d0eeea 50%,#e8f5f3 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', width: '50%' }} />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function UserTicketsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, logout, getApiErrorMessage } = useAuth()

  const { tickets, loading, refetch } = useTickets()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [hoveredTicket, setHoveredTicket] = useState(null)
  const searchTimeoutRef = useRef(null)

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(searchTimeoutRef.current)
  }, [searchQuery])

  const handleLogout = () => { 
    logout()
    navigate('/signin', { replace: true }) 
  }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map(item => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role]
  )

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = !debouncedSearch || 
        ticket.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        ticket.id?.toString().includes(debouncedSearch)
      
      const matchesPriority = filterPriority === 'ALL' || ticket.priority === filterPriority
      const matchesStatus = filterStatus === 'ALL' || ticket.status === filterStatus
      
      return matchesSearch && matchesPriority && matchesStatus
    })
  }, [tickets, debouncedSearch, filterPriority, filterStatus])

  // Calculate stats
  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED').length,
  }), [tickets])

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

        @keyframes shimmer { to { background-position: -200% 0 } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }

        .page-fade { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) both }

        .report-btn {
          background: linear-gradient(135deg,#3b82f6,#2563eb);
          color: #fff; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 600;
          padding: 0.6rem 1.2rem; border-radius: 8px;
          box-shadow: 0 2px 8px rgba(59,130,246,0.3);
          transition: all 0.15s;
          display: flex; align-items: center; gap: 0.4rem; white-space: nowrap;
        }
        .report-btn:hover {
          background: linear-gradient(135deg,#2563eb,#1d4ed8);
          box-shadow: 0 4px 12px rgba(59,130,246,0.4);
          transform: translateY(-1px);
        }
        .report-btn:active { transform: translateY(0) }

        .search-input {
          background: #fff; border: 1px solid #d1d5db;
          color: #111827; border-radius: 6px;
          padding: 0.6rem 0.875rem; font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; transition: all 0.15s;
        }
        .search-input::placeholder { color: #9ca3af }
        .search-input:focus {
          outline: none; border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        .empty-state { text-align: center; padding: 3rem 2rem }
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
        <UserDashboardHeader onLogout={handleLogout} eyebrow="Support System" title="My Tickets" />

        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

          {/* ── Page title + CTA ── */}
          <div className="page-fade" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0d2b25', margin: 0, lineHeight: 1.2 }}>
                Tickets
              </h1>
              <p style={{ fontSize: '0.85rem', color: '#7ab5a8', marginTop: '0.3rem', margin: '0.3rem 0 0' }}>
                Report and track maintenance issues.
              </p>
            </div>
            <button className="report-btn" onClick={() => setShowModal(true)}>
              <span style={{ fontSize: '1rem' }}>+</span> Report Issue
            </button>
          </div>

          {/* ── Search & Filters ── */}
          <div className="page-fade" style={{ animationDelay: '0.1s', marginBottom: '1.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
              <input
                type="text"
                placeholder="Search tickets..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
            </div>
            <select 
              className="search-input" 
              value={filterPriority} 
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select 
              className="search-input" 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* ── Tickets List ── */}
          <div className="page-fade" style={{ animationDelay: '0.15s' }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            ) : filteredTickets.length === 0 ? (
              <div className="ticket-card" style={{ border: 'none', textAlign: 'center', boxShadow: 'none' }}>
                <div className="empty-state">
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎫</div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: '#0d2b25', margin: '0 0 0.35rem' }}>
                    {debouncedSearch || filterPriority !== 'ALL' || filterStatus !== 'ALL'
                      ? 'No tickets found'
                      : 'No tickets yet'}
                  </p>
                  <p style={{ fontSize: '0.82rem', color: '#7ab5a8', margin: '0 0 1.25rem' }}>
                    {debouncedSearch || filterPriority !== 'ALL' || filterStatus !== 'ALL'
                      ? 'Try adjusting your filters or search.'
                      : 'Report an issue to get started.'}
                  </p>
                  {debouncedSearch === '' && filterPriority === 'ALL' && filterStatus === 'ALL' && (
                    <button className="report-btn" style={{ margin: '0 auto' }} onClick={() => setShowModal(true)}>
                      + Report Issue
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredTickets.map((ticket) => {
                  const priorityData = getPriority(ticket.priority)
                  const statusData = getStatus(ticket.status)

                  return (
                    <div 
                      key={ticket.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                      onMouseEnter={() => setHoveredTicket(ticket.id)}
                      onMouseLeave={() => setHoveredTicket(null)}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em' }}>#{ticket.id}</span>
                          <span 
                            style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              padding: '0.25rem 0.65rem', 
                              borderRadius: '100px',
                              background: priorityData.bg,
                              color: priorityData.color,
                              border: `1px solid ${priorityData.border}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            ● {priorityData.label}
                          </span>
                          <span 
                            style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              padding: '0.25rem 0.65rem', 
                              borderRadius: '100px',
                              background: statusData.bg,
                              color: statusData.color,
                              border: `1px solid ${statusData.border}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            ● {statusData.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Updated: {formatDate(ticket.updatedAt || ticket.createdAt)}</span>
                      </div>
                      
                      <div style={{ marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: 0, marginBottom: '0.25rem' }}>
                          {ticket.title}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
                          {ticket.description}
                        </p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          📅 {formatDate(ticket.createdAt)}
                        </span>
                        <a 
                          href="#" 
                          style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                          onClick={(e) => { e.preventDefault(); setSelectedTicket(ticket) }}
                        >
                          View Details
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL */}
      {showModal && (
        <CreateTicketModal
          onClose={() => setShowModal(false)}
          onSuccess={refetch}
        />
      )}

      {/* TICKET DETAILS MODAL */}
      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}


// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, bg, textColor = '#fff', icon, loading }) {
  return null
}