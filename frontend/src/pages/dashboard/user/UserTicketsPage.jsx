import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createTicketComment, deleteTicket, deleteTicketComment, getUserTicketAttachmentUrl as getTicketAttachmentUrl, getUserTicketById as getTicketById, getUserTickets as getTickets, updateTicketComment } from '../../../api/ticketApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'
import TicketFormModal from './components/TicketFormModal'
import TicketDetailsModal from './components/TicketDetailsModal'
import { Button } from '../../../components/ui/Button'

const STATUS_META = {
  OPEN: { label: 'Open', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  CLOSED: { label: 'Closed', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
}

function formatDateTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

function extractStorageKey(fileUrl) {
  if (!fileUrl) return null
  try {
    const parsed = new URL(fileUrl)
    return parsed.pathname?.replace(/^\//, '') || null
  } catch {
    return fileUrl
  }
}

function TicketBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.OPEN
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${meta.bg} ${meta.text} ${meta.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function UserTicketsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage, user } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('CREATE')
  const [activeTicket, setActiveTicket] = useState(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [previewTicket, setPreviewTicket] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [attachmentUrls, setAttachmentUrls] = useState({})
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const { role, user, logout, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)

  const loadTickets = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await getTickets()
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : []
      setTickets(sorted)
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

  const headerLabels = getHeaderLabelsByRole(role)

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter
      const matchesSearch = !q || [ticket.title, ticket.description, ticket.category, ticket.priority]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
      return matchesStatus && matchesSearch
    })
  }, [search, statusFilter, tickets])

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'OPEN').length,
    progress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
  }), [tickets])

  const openTicketForm = (mode = 'CREATE', ticket = null) => {
    setFormMode(mode)
    setActiveTicket(ticket)
    setIsFormOpen(true)
  }

  const closeTicketForm = () => {
    setIsFormOpen(false)
    setActiveTicket(null)
  }

  const loadAttachmentUrls = useCallback(async (ticketData) => {
    const attachments = Array.isArray(ticketData?.attachments) ? ticketData.attachments : []
    if (attachments.length === 0) {
      setAttachmentUrls({})
      return
    }

    try {
      const entries = await Promise.all(attachments.map(async (attachment) => {
        const key = extractStorageKey(attachment)
        if (!key) return [attachment, null]
        try {
          const signed = await getTicketAttachmentUrl(ticketData.id, key)
          return [attachment, signed?.url || null]
        } catch {
          return [attachment, null]
        }
      }))
      setAttachmentUrls(Object.fromEntries(entries.filter(([, value]) => value)))
    } catch {
      setAttachmentUrls({})
    }
  }, [])

  const loadTicketDetails = useCallback(async (ticketId) => {
    const data = await getTicketById(ticketId)
    setPreviewTicket(data || null)
    setCommentText('')
    await loadAttachmentUrls(data)
    return data || null
  }, [loadAttachmentUrls])

  const handleViewTicket = async (ticket) => {
    setProcessingId(ticket.id)
    setErrorMessage('')
    try {
      const data = await loadTicketDetails(ticket.id)
      setPreviewTicket(data || ticket)
      setIsDetailsOpen(true)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  const closeTicketDetails = () => {
    setIsDetailsOpen(false)
    setPreviewTicket(null)
    setCommentText('')
    setAttachmentUrls({})
  }

  const handleEditFromDetails = (ticket) => {
    closeTicketDetails()
    openTicketForm('EDIT', ticket)
  }

  const handleDeleteFromDetails = async (ticket) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return
    setProcessingId(ticket.id)
    setErrorMessage('')
    try {
      await deleteTicket(ticket.id)
      closeTicketDetails()
      await loadTickets()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  const handleAddComment = async () => {
    if (!previewTicket?.id || !commentText.trim()) return
    setErrorMessage('')
    try {
      await createTicketComment(previewTicket.id, commentText.trim())
      await loadTicketDetails(previewTicket.id)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?') || !previewTicket) return
    setProcessingId(previewTicket.id)
    try {
      await deleteTicketComment(previewTicket.id, commentId)
      await loadTicketDetails(previewTicket.id)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  const handleUpdateComment = async (commentId) => {
    if (!editingCommentText.trim() || !previewTicket) return
    setProcessingId(previewTicket.id)
    try {
      await updateTicketComment(previewTicket.id, commentId, editingCommentText.trim())
      setEditingCommentId(null)
      setEditingCommentText('')
      await loadTicketDetails(previewTicket.id)
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
          <UserDashboardHeader
            onLogout={handleLogout}
            eyebrow="Academic Support"
            title="Service Hub"
          />
      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader eyebrow={headerLabels.eyebrow} title={headerLabels.title} />

        <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8">
          {errorMessage ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-bold">
              {errorMessage}
            </div>
          ) : null}

          <section className="mb-6 rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Personal Assistance</h2>
                <p className="mt-3 text-sm font-semibold text-slate-500 leading-relaxed">
                  Track your service requests, communicate with campus staff, and monitor the progress of your incident reports in real-time.
                </p>
                <button
                  type="button"
                  onClick={() => openTicketForm('CREATE')}
                  className="mt-6 rounded-2xl bg-indigo-600 px-8 py-3.5 text-xs font-black text-white uppercase tracking-widest transition-all duration-300 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/20 active:scale-95"
                >
                  Create New Ticket
                </button>
          <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8">
            <section className="mb-8 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-950 p-8 text-white shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Support Stream</h2>
                  <p className="mt-2 text-indigo-100/70 max-w-md font-medium">
                    Submit maintenance requests or report issues. You have {stats.open} active investigations ongoing.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={loadTickets} className="border-white/20 text-white hover:bg-white/10">
                    <span className="material-symbols-outlined mr-2">refresh</span> Sync List
                  </Button>
                  <Button onClick={openCreateTicket} className="bg-white text-indigo-950 hover:bg-indigo-50 border-none shadow-lg px-8">
                    Create Request
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Requests', val: stats.total, color: 'text-slate-900', icon: 'history' },
              { label: 'Pending Review', val: stats.open, color: 'text-amber-600', icon: 'pending' },
              { label: 'Under Repair', val: stats.progress, color: 'text-indigo-600', icon: 'handyman' },
              { label: 'Resolved', val: stats.resolved, color: 'text-emerald-600', icon: 'verified' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                   <span className={`material-symbols-outlined ${s.color} opacity-40`}>{s.icon}</span>
                </div>
                <h3 className={`text-4xl font-black ${s.color}`}>{isLoading ? '—' : s.val}</h3>
              </div>
            ))}
          </section>
            <section className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
              <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Submissions</p>
                <h3 className="text-3xl font-black text-slate-900">{stats.total}</h3>
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Open Issues</p>
                <h3 className="text-3xl font-black text-amber-600">{stats.open}</h3>
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">In Progress</p>
                <h3 className="text-3xl font-black text-indigo-600">{stats.progress}</h3>
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Resolved</p>
                <h3 className="text-3xl font-black text-emerald-600">{stats.resolved}</h3>
              </div>
            </section>

          <section className="mt-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto md:min-w-[320px]">
                <span className="material-symbols-outlined text-slate-400">search</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search your tickets..."
                  className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
                />
              </div>
            <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
              <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Investigations</h3>
                  <p className="text-sm font-medium text-slate-500">Service requests submitted for campus maintenance.</p>
                </div>
                <div className="relative group max-w-sm w-full">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">search</span>
                  </span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter by title, category..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-12 pr-5 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                      statusFilter === status
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    {status === 'ALL' ? 'Everything' : status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Reference</th>
                      <th className="px-6 py-4">Submission Date</th>
                      <th className="px-6 py-4">Current State</th>
                      <th className="px-6 py-4 text-right">Operations</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50 bg-white text-slate-700">
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 tracking-tight">{ticket.title}</div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">ID: {ticket.id}</div>
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4"><TicketBadge status={ticket.status} /></td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTicket(ticket)}
                            className="rounded-xl font-black uppercase tracking-widest text-[10px] px-4"
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredTickets.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-20 text-center text-slate-400 font-medium italic">
                          No matching support requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </div>
            {isLoading ? (
               <div className="py-24 text-center">
                 <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                 <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-400">Fetching your records...</p>
               </div>
            ) : filteredTickets.length === 0 ? (
               <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                 <span className="material-symbols-outlined text-slate-300 text-6xl">receipt_long</span>
                 <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-400">No tickets found in this view.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="group relative flex flex-col rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all duration-500 hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <TicketBadge status={ticket.status} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">#{ticket.id}</span>
                      </div>

                      <h4 className="text-xl font-black text-slate-900 tracking-tight line-clamp-1 mb-2 group-hover:text-indigo-600 transition-colors">
                        {ticket.title || `Ticket #${ticket.id}`}
                      </h4>
                      <p className="text-xs font-semibold text-slate-500 line-clamp-2 mb-6 min-h-[32px]">
                        {ticket.description || 'No additional details.'}
                      </p>

                      <div className="mt-auto space-y-4">
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                           <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Category</p>
                              <p className="text-[11px] font-bold text-slate-700">{ticket.category || 'General'}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Created</p>
                              <p className="text-[11px] font-bold text-slate-700">{formatDateTime(ticket.createdAt).split(',')[0]}</p>
                           </div>
                        </div>

                        <button
                          onClick={() => handleViewTicket(ticket)}
                          disabled={processingId === ticket.id}
                          className="w-full rounded-xl bg-slate-50 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-900 hover:text-white"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                 ))}
               </div>
            )}
          </section>
        </main>
      </div>

      <TicketFormModal
        open={isFormOpen}
        mode={formMode}
        ticket={activeTicket}
        onClose={closeTicketForm}
        onSaved={() => {
          loadTickets()
          closeTicketForm()
        }}
        getApiErrorMessage={getApiErrorMessage}
      />

      <TicketDetailsModal
        open={isDetailsOpen}
        ticket={previewTicket}
        onClose={closeTicketDetails}
        onEdit={handleEditFromDetails}
        onDelete={handleDeleteFromDetails}
        onAddComment={handleAddComment}
        commentText={commentText}
        onCommentTextChange={setCommentText}
        isDeleting={processingId === previewTicket?.id}
        attachmentUrls={attachmentUrls}
        currentUserEmail={user?.email}
        onDeleteComment={handleDeleteComment}
        onUpdateComment={handleUpdateComment}
        editingCommentId={editingCommentId}
        setEditingCommentId={setEditingCommentId}
        editingCommentText={editingCommentText}
        setEditingCommentText={setEditingCommentText}
      />
    </div>
  )
}

export default UserTicketsPage