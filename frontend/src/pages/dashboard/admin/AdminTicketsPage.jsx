import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { assignAdminTicket, createTicketComment, getAdminTicketAttachmentUrl, getAdminTicketById, getAdminTickets, updateAdminTicketStatus, rejectAdminTicket } from '../../../api/ticketApi'
import { getUsers } from '../../../api/adminApi'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

const STATUS_META = {
  OPEN: { label: 'Open', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CLOSED: { label: 'Closed', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
}

function TicketBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.OPEN
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${meta.bg} ${meta.text} ${meta.border}`}>
      {meta.label}
    </span>
  )
}

function formatDateTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString()
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

function isImageAttachment(fileUrl) {
  return /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(String(fileUrl || ''))
}

function getSLADisplay(dueDate) {
  if (!dueDate) return null
  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due - now
  const isOverdue = diffMs < 0
  const absDiff = Math.abs(diffMs)

  const hours = Math.floor(absDiff / (1000 * 60 * 60))
  const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))

  if (isOverdue) {
    return {
      text: `Overdue by ${hours}h ${mins}m`,
      color: 'text-red-600',
      icon: 'priority_high',
      bg: 'bg-red-50',
    }
  }

  return {
    text: `Due in ${hours}h ${mins}m`,
    color: hours < 4 ? 'text-amber-600' : 'text-emerald-600',
    icon: 'schedule',
    bg: hours < 4 ? 'bg-amber-50' : 'bg-emerald-50',
  }
}

function TicketDetailsModal({
  open,
  ticket,
  onClose,
  onAddComment,
  commentText,
  onCommentTextChange,
  isCommentSubmitting,
  attachmentUrls,
  isAttachmentsLoading,
  currentUserEmail,
  onReject,
  isActionProcessing,
  isRejecting,
  setIsRejecting,
  rejectionReason,
  setRejectionReason,
}) {
  if (!open || !ticket) {
    return null
  }

  const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : []
  const comments = Array.isArray(ticket.comments) ? ticket.comments : []
  const sla = getSLADisplay(ticket.dueDate)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => {
        setIsRejecting(false)
        setRejectionReason('')
        onClose()
      }} />
      <div className="relative w-full max-w-6xl rounded-3xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[95vh]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600/10 text-indigo-700">
              <span className="material-symbols-outlined">confirmation_number</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{ticket.title || `Ticket #${ticket.id}`}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Recorded {formatDateTime(ticket.createdAt)} • {ticket.category || 'General'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sla && ticket.status === 'OPEN' && (
              <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold ${sla.bg} ${sla.color}`}>
                <span className="material-symbols-outlined text-[18px]">{sla.icon}</span>
                {sla.text}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Maintenance Request Details</p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{ticket.description || '-'}</div>

            {ticket.status === 'REJECTED' && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-red-700 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-800 font-medium">{ticket.rejectionReason || 'No reason provided.'}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Detail label="Status" value={<TicketBadge status={ticket.status} />} />
              <Detail label="Priority" value={ticket.priority || '-'} />
              <Detail label="Category" value={ticket.category || '-'} />
              <Detail label="Contact Number" value={ticket.contactNumber || '-'} />
              <Detail label="Reported By" value={ticket.userEmail || ticket.userId || '-'} />
              <Detail label="Assigned Technician" value={ticket.technicianEmail || 'Unassigned'} />
              <Detail label="Created" value={formatDateTime(ticket.createdAt)} />
              <Detail label="Ticket ID" value={ticket.id} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Attachments</p>
              {attachments.length > 0 ? (
                <ul className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {attachments.map((attachment, index) => (
                    <li key={`${attachment}-${index}`}>
                      {attachmentUrls?.[attachment] ? (
                        <a
                          href={attachmentUrls[attachment]}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-700"
                        >
                          Attachment {index + 1}
                        </a>
                      ) : (
                        <span className="text-slate-400">Attachment {index + 1}</span>
                      )}
                      {isImageAttachment(attachment) && attachmentUrls?.[attachment] ? (
                        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                          <img src={attachmentUrls[attachment]} alt={`Attachment ${index + 1}`} className="max-h-40 w-full object-contain" />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No attachments.</div>
              )}
              {isAttachmentsLoading ? <p className="text-xs text-slate-400">Loading secure attachment links...</p> : null}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Discussion History</p>
              <span className="text-xs font-semibold text-slate-400">{comments.length} message{comments.length === 1 ? '' : 's'}</span>
            </div>
            <div className="max-h-[380px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
              {comments.length > 0 ? comments.map((comment) => (
                <div key={comment.id} className={`flex ${String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase() ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase() ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-slate-50 text-slate-700'}`}>
                    <div className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase() ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {comment.createdBy || comment.userEmail || 'System'}
                    </div>
                    <p className="text-sm">{comment.message}</p>
                    <div className={`mt-1 text-[10px] ${String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase() ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {formatDateTime(comment.createdAt)}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No messages yet.</div>
              )}
            </div>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                onAddComment()
              }}
            >
              <textarea
                value={commentText}
                onChange={(event) => onCommentTextChange(event.target.value)}
                rows={4}
                placeholder="Write a message to the reporter..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isCommentSubmitting || !commentText.trim()}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCommentSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
          <div className="flex gap-2">
            {ticket.status === 'OPEN' && !isRejecting && (
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                disabled={isActionProcessing}
                className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">cancel</span>
                Reject Ticket
              </button>
            )}

            {isRejecting && (
              <div className="w-full space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-xs font-bold uppercase tracking-wider text-red-700">Enter Rejection Reason</p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this ticket is being rejected..."
                  className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRejecting(false)
                      setRejectionReason('')
                    }}
                    className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onReject}
                    disabled={!rejectionReason.trim() || isActionProcessing}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function Detail({ label, value }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {value}
      </div>
    </div>
  )
}


function AdminTicketsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, user, logout, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [technicians, setTechnicians] = useState([])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [assignmentByTicket, setAssignmentByTicket] = useState({})
  const [processingId, setProcessingId] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [attachmentUrls, setAttachmentUrls] = useState({})
  const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isActionProcessing, setIsActionProcessing] = useState(false)

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

  useEffect(() => {
    let mounted = true
    const loadTechnicians = async () => {
      try {
        const response = await getUsers({ role: 'TECHNICIAN', active: true, size: 100 })
        if (!mounted) return
        setTechnicians(response?.content || response || [])
      } catch {
        if (mounted) setTechnicians([])
      }
    }
    loadTechnicians()
    return () => { mounted = false }
  }, [])

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
      const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter
      const matchesSearch = !q || [ticket.title, ticket.description, ticket.category, ticket.priority, ticket.userEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))

      return matchesStatus && matchesPriority && matchesSearch
    })
  }, [search, statusFilter, priorityFilter, tickets])

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

  const handleViewTicket = async (ticket) => {
    setProcessingId(ticket.id)
    setErrorMessage('')
    try {
      const data = await loadTicketDetails(ticket.id)
      setSelectedTicket(data || ticket)
      setDetailsOpen(true)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  const loadAttachmentUrls = useCallback(async (ticketData) => {
    const attachments = Array.isArray(ticketData?.attachments) ? ticketData.attachments : []
    if (attachments.length === 0) {
      setAttachmentUrls({})
      return
    }

    setIsAttachmentsLoading(true)
    try {
      const entries = await Promise.all(attachments.map(async (attachment) => {
        const key = extractStorageKey(attachment)
        if (!key) return [attachment, null]
        try {
          const signed = await getAdminTicketAttachmentUrl(ticketData.id, key)
          return [attachment, signed?.url || null]
        } catch {
          return [attachment, null]
        }
      }))

      setAttachmentUrls(Object.fromEntries(entries.filter(([, value]) => value)))
    } finally {
      setIsAttachmentsLoading(false)
    }
  }, [])

  const loadTicketDetails = useCallback(async (ticketId) => {
    const data = await getAdminTicketById(ticketId)
    setSelectedTicket(data || null)
    setCommentText('')
    await loadAttachmentUrls(data)
    return data || null
  }, [loadAttachmentUrls])

  const handleAddComment = async () => {
    if (!selectedTicket?.id || !commentText.trim()) {
      return
    }

    setIsCommentSubmitting(true)
    setErrorMessage('')

    try {
      await createTicketComment(selectedTicket.id, commentText.trim())
      await loadTicketDetails(selectedTicket.id)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsCommentSubmitting(false)
    }
  }

  const handleRejectTicket = async () => {
    if (!rejectionReason.trim() || !selectedTicket?.id) return

    setIsActionProcessing(true)
    setErrorMessage('')
    try {
      await rejectAdminTicket(selectedTicket.id, rejectionReason.trim())
      await loadTickets()
      setIsRejecting(false)
      setRejectionReason('')
      setDetailsOpen(false)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsActionProcessing(false)
    }
  }

  const handleAssignTicket = async (ticket) => {
    const technicianId = assignmentByTicket[ticket.id]
    if (!technicianId) return

    setProcessingId(ticket.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await assignAdminTicket(ticket.id, Number(technicianId))
      setSuccessMessage('Ticket reassigned successfully.')
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
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'].map((status) => (
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

            <div className="mb-4 flex flex-wrap gap-2">
              {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setPriorityFilter(priority)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${priorityFilter === priority ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  {priority === 'ALL' ? 'All priorities' : priority}
                </button>
              ))}
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
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewTicket(ticket)}
                              disabled={processingId === ticket.id}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              View
                            </button>
                            <select
                              value={assignmentByTicket[ticket.id] || ticket.technicianId || ''}
                              onChange={(event) => setAssignmentByTicket((prev) => ({ ...prev, [ticket.id]: event.target.value }))}
                              className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            >
                              <option value="">Assign technician</option>
                              {technicians.map((tech) => (
                                <option key={tech.id} value={tech.id}>{tech.fullName || tech.email}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAssignTicket(ticket)}
                              disabled={processingId === ticket.id || !assignmentByTicket[ticket.id]}
                              className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Assign
                            </button>
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
                          </div>
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

      <TicketDetailsModal
        open={detailsOpen}
        ticket={selectedTicket}
        onClose={() => {
          setDetailsOpen(false)
          setSelectedTicket(null)
          setCommentText('')
          setAttachmentUrls({})
          setIsAttachmentsLoading(false)
        }}
        onAddComment={handleAddComment}
        commentText={commentText}
        onCommentTextChange={setCommentText}
        isCommentSubmitting={isCommentSubmitting}
        attachmentUrls={attachmentUrls}
        isAttachmentsLoading={isAttachmentsLoading}
        currentUserEmail={user?.email}
        onReject={handleRejectTicket}
        isActionProcessing={isActionProcessing}
        isRejecting={isRejecting}
        setIsRejecting={setIsRejecting}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
      />
    </div>
  )
}

export default AdminTicketsPage


