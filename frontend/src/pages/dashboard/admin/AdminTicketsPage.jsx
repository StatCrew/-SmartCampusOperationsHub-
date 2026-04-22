import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { assignAdminTicket, createTicketComment, deleteTicketComment, getAdminTicketAttachmentUrl, getAdminTicketById, getAdminTickets, rejectAdminTicket, updateAdminTicketStatus, updateTicketComment } from '../../../api/ticketApi'
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
  rejectionReason,
  setRejectionReason,
  onDeleteComment,
  onUpdateComment,
  editingCommentId,
  setEditingCommentId,
  editingCommentText,
  setEditingCommentText,
}) {
  if (!open || !ticket) {
    return null
  }

  const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : []
  const comments = Array.isArray(ticket.comments) ? ticket.comments : []
  const sla = getSLADisplay(ticket.dueDate)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl rounded-[2rem] bg-white p-6 shadow-2xl overflow-y-auto max-h-[95vh] no-scrollbar">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-50 pb-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <span className="material-symbols-outlined text-[24px]">confirmation_number</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <TicketBadge status={ticket.status} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ticket #{ticket.id}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">{ticket.title || `Ticket #${ticket.id}`}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sla && ticket.status === 'OPEN' && (
              <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold ${sla.bg} ${sla.color} animate-pulse`}>
                <span className="material-symbols-outlined text-[18px]">{sla.icon}</span>
                {sla.text}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-red-50 hover:text-red-500 shadow-sm"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ml-1">Request Context</p>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                {ticket.description || '-'}
              </div>
            </div>

            {ticket.status === 'REJECTED' && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Rejection Reason</p>
                </div>
                <p className="text-sm text-red-800 font-medium leading-relaxed">{ticket.rejectionReason || 'No reason provided.'}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Detail label="Status" value={<TicketBadge status={ticket.status} />} />
              <Detail label="Priority Level" value={ticket.priority || 'Medium'} />
              <Detail label="Service Category" value={ticket.category || 'General'} />
              <Detail label="Contact Number" value={ticket.contactNumber || '-'} />
              <Detail label="Reported By" value={ticket.userEmail || ticket.userId || '-'} />
              <Detail label="Assigned Technician" value={ticket.technicianEmail || 'Unassigned'} />
              <Detail label="Submission Date" value={formatDateTime(ticket.createdAt)} />
              <Detail label="Last Updated" value={formatDateTime(ticket.updatedAt)} />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Attachments {attachments.length > 0 && `(${attachments.length})`}</p>
              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {attachments.map((attachment, index) => {
                    const isImg = isImageAttachment(attachment)
                    const url = attachmentUrls?.[attachment]

                    return (
                      <div key={`${attachment}-${index}`} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 transition hover:border-indigo-300 hover:shadow-lg">
                        {isImg ? (
                          <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                            {url ? (
                              <img
                                src={url}
                                alt={`Evidence ${index + 1}`}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                              </div>
                            )}
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition group-hover:opacity-100"
                            >
                              <span className="material-symbols-outlined text-white">open_in_new</span>
                            </a>
                          </div>
                        ) : (
                          <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 text-slate-400">
                            <span className="material-symbols-outlined text-4xl">description</span>
                            <p className="px-2 text-center text-[10px] font-bold uppercase tracking-tighter">Document {index + 1}</p>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 rounded-lg bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-indigo-700"
                            >
                              Open File
                            </a>
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">File {index + 1}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <span className="material-symbols-outlined text-slate-300 text-4xl">cloud_off</span>
                  <p className="mt-2 text-sm text-slate-400 font-medium">No evidence attached.</p>
                </div>
              )}
              {isAttachmentsLoading ? <p className="text-[10px] text-slate-400 italic">Refreshing secure access links...</p> : null}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Communication Thread</p>
              <span className="text-xs font-semibold text-slate-400">{comments.length} message{comments.length === 1 ? '' : 's'}</span>
            </div>
            <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 no-scrollbar">
              {comments.length > 0 ? comments.map((comment) => {
                const isMe = String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase()
                const isEditing = editingCommentId === comment.id

                return (
                  <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`group relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                      isMe ? 'bg-indigo-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700'
                    }`}>
                      {isEditing ? (
                        <div className="space-y-2 min-w-[200px]">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full rounded-lg border-none bg-white/10 p-2 text-sm text-white placeholder-white/50 focus:ring-1 focus:ring-white/30 outline-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingCommentId(null)}
                              className="text-[10px] font-bold uppercase hover:underline"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => onUpdateComment(comment.id)}
                              className="text-[10px] font-bold uppercase hover:underline"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm leading-relaxed">{comment.message}</p>
                          {isMe && (
                            <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id)
                                  setEditingCommentText(comment.message)
                                }}
                                className="p-1 rounded-full hover:bg-white/20 text-white transition"
                                title="Edit comment"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button
                                onClick={() => onDeleteComment(comment.id)}
                                className="p-1 rounded-full hover:bg-white/20 text-white transition"
                                title="Delete comment"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className={`mt-1 flex items-center gap-2 px-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{isMe ? 'You' : (comment.createdBy || 'Staff')}</span>
                      <span className="text-[9px] text-slate-300">•</span>
                      <span className="text-[9px] text-slate-300 font-medium">{formatDateTime(comment.createdAt)}</span>
                    </div>
                  </div>
                )
              }) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 text-center">No messages exchanged yet.</div>
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
                rows={3}
                placeholder="Write a message to the reporter..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isCommentSubmitting || !commentText.trim()}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-indigo-600/20"
                >
                  {isCommentSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="mt-6 flex flex-col gap-5 border-t border-slate-100 pt-5">
          {ticket.status === 'OPEN' && (
            <div className="space-y-3 rounded-2xl bg-red-50/50 p-4 border border-red-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 text-[20px]">report</span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Administrative Rejection</p>
              </div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this ticket is being rejected..."
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
                rows={2}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onReject}
                  disabled={isActionProcessing || !rejectionReason.trim()}
                  className="rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/20"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div />
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-8 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 shadow-sm"
            >
              Close Management View
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function Detail({ label, value }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">{label}</p>
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-700 font-medium shadow-sm">
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
  const [rejectionReason, setRejectionReason] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  const loadTickets = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await getAdminTickets()
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

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?') || !selectedTicket) return
    
    setIsActionProcessing(true)
    try {
      await deleteTicketComment(selectedTicket.id, commentId)
      await loadTicketDetails(selectedTicket.id)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsActionProcessing(false)
    }
  }

  const handleUpdateComment = async (commentId) => {
    if (!editingCommentText.trim() || !selectedTicket) return
    
    setIsActionProcessing(true)
    try {
      await updateTicketComment(selectedTicket.id, commentId, editingCommentText.trim())
      setEditingCommentId(null)
      setEditingCommentText('')
      await loadTicketDetails(selectedTicket.id)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsActionProcessing(false)
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
      setRejectionReason('')
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
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED'].map((status) => (
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
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
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

export default AdminTicketsPage


