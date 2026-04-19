import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAdminTickets, updateAdminTicketStatus } from '../../../api/ticketApi'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

const STATUS_META = {
  OPEN: { label: 'Open', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CLOSED: { label: 'Closed', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
}

function TicketBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.OPEN
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${meta.bg} ${meta.text} ${meta.border}`}>
      {meta.label}
    </span>
  )
}

function AdminTicketsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [processingId, setProcessingId] = useState(null)

  const loadTickets = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await getAdminTickets()
      setTickets(data || [])
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [getApiErrorMessage])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter
      const matchesSearch = !q || [ticket.title, ticket.description, ticket.category, ticket.priority, ticket.userEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))

      return matchesStatus && matchesSearch
    })
  }, [search, statusFilter, tickets])

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    progress: tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
  }), [tickets])

  const handleStatusChange = async (ticket, nextStatus) => {
    setProcessingId(ticket.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateAdminTicketStatus(ticket.id, nextStatus)
      setSuccessMessage('Ticket status updated successfully.')
      await loadTickets()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={(item) => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader eyebrow="Admin Operations" title="Ticket Management" />

        <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8">
          {errorMessage ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
          {successMessage ? (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Manage Support Tickets</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Review all tickets and move them through the resolution workflow.
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Total Tickets</p>
              <h3 className="mt-2 text-3xl font-bold text-slate-900">{isLoading ? '—' : stats.total}</h3>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Open</p>
              <h3 className="mt-2 text-3xl font-bold text-amber-600">{isLoading ? '—' : stats.open}</h3>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">In Progress</p>
              <h3 className="mt-2 text-3xl font-bold text-indigo-600">{isLoading ? '—' : stats.progress}</h3>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Resolved</p>
              <h3 className="mt-2 text-3xl font-bold text-emerald-600">{isLoading ? '—' : stats.resolved}</h3>
            </div>
          </section>

          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by ticket, user, or category"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 md:max-w-md"
              />

              <div className="flex flex-wrap gap-2">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      statusFilter === status
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {status === 'ALL' ? 'All' : status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ticket</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>Loading tickets...</td>
                    </tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No tickets found.</td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{ticket.title || `Ticket #${ticket.id}`}</div>
                          <p className="mt-1 max-w-xl truncate text-xs text-slate-500">{ticket.description || '-'}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          <div className="font-medium">{ticket.userEmail || ticket.userId || '-'}</div>
                          {ticket.technicianEmail ? (
                            <p className="text-xs text-slate-500">Tech: {ticket.technicianEmail}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-slate-700">{ticket.category || '-'}</td>
                        <td className="px-4 py-4 text-slate-700">{ticket.priority || '-'}</td>
                        <td className="px-4 py-4"><TicketBadge status={ticket.status} /></td>
                        <td className="px-4 py-4 text-right">
                          <select
                            value={ticket.status || 'OPEN'}
                            onChange={(event) => handleStatusChange(ticket, event.target.value)}
                            disabled={processingId === ticket.id}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default AdminTicketsPage


