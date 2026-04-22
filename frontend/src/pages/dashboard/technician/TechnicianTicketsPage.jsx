import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import apiClient from '../../../api/authService'
import { createTicketComment, deleteTicketComment, getTechnicianTicketAttachmentUrl, getTechnicianTicketById, getTechnicianTickets, resolveTechnicianTicket, updateTicketComment } from '../../../api/ticketApi'
import { sendAdminTestNotification } from '../../../api/adminApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

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

function formatDateTime(value) {
  if (!value) return '-'
  try { return new Date(value).toLocaleString() } catch { return String(value) }
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

function TechnicianTicketDetailsModal({
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
  onResolve,
  isActionProcessing,
  resolutionNotes,
  setResolutionNotes,
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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl rounded-[2.5rem] bg-white p-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar animate-in zoom-in-95 duration-200">
        <div className="mb-8 flex items-center justify-between gap-4 border-b border-slate-50 pb-6">
          <div className="flex items-center gap-5">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20">
              <span className="material-symbols-outlined text-[28px]">confirmation_number</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TicketBadge status={ticket.status} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ref: #{ticket.id}</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{ticket.title || `Ticket #${ticket.id}`}</h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {sla && ticket.status === 'IN_PROGRESS' && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest ${sla.bg} ${sla.color} border border-current/10 animate-pulse`}>
                <span className="material-symbols-outlined text-[18px]">{sla.icon}</span>
                {sla.text}
              </div>
            )}
            <Button variant="outline" onClick={onClose} className="w-11 h-11 !p-0 rounded-2xl">
              <span className="material-symbols-outlined">close</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className="space-y-8">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Problem Description</p>
              <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner font-medium">
                {ticket.description || 'No description provided.'}
              </div>
            </div>

            {ticket.status === 'RESOLVED' && (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-emerald-500 text-[24px]">verified</span>
                  <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Resolution Summary</p>
                </div>
                <p className="text-sm text-emerald-800 font-bold leading-relaxed">{ticket.resolutionNotes || 'Problem fixed.'}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail label="Status" value={<TicketBadge status={ticket.status} />} />
              <Detail label="Priority" value={ticket.priority || 'Medium'} />
              <Detail label="Category" value={ticket.category || 'General'} />
              <Detail label="Contact" value={ticket.contactNumber || '-'} />
              <Detail label="Reporter" value={ticket.userEmail || ticket.userId || '-'} />
              <Detail label="Reference ID" value={ticket.id} />
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Attached Evidence {attachments.length > 0 && `(${attachments.length})`}</p>
              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {attachments.map((attachment, index) => {
                    const isImg = isImageAttachment(attachment)
                    const url = attachmentUrls?.[attachment]

                    return (
                      <div key={`${attachment}-${index}`} className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-2.5 transition-all hover:border-indigo-300 hover:shadow-xl">
                        {isImg ? (
                          <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-slate-100">
                            {url ? (
                              <img
                                src={url}
                                alt={`Evidence ${index + 1}`}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                              </div>
                            )}
                            <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition group-hover:opacity-100">
                              <Button variant="primary" size="sm">Inspect Image</Button>
                            </a>
                          </div>
                        ) : (
                          <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-[1.5rem] bg-slate-50 text-slate-400">
                            <span className="material-symbols-outlined text-5xl">description</span>
                            <p className="text-[10px] font-black uppercase tracking-widest">Document #{index + 1}</p>
                            <a href={url} target="_blank" rel="noreferrer">
                              <Button variant="outline" size="sm">Download</Button>
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
                  <span className="material-symbols-outlined text-slate-300 text-5xl mb-2">image_not_supported</span>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No evidence provided</p>
                </div>
              )}
              {isAttachmentsLoading ? <p className="text-[10px] text-slate-400 italic text-center">Refreshing secure assets...</p> : null}
            </div>
          </section>

          <section className="flex flex-col rounded-[2.5rem] border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Activity Thread</p>
              <Badge variant="neutral">{comments.length} Messages</Badge>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-5 no-scrollbar mb-6 min-h-[300px]">
              {comments.length > 0 ? comments.map((comment) => {
                const isMe = String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase()
                const isEditing = editingCommentId === comment.id

                return (
                  <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`group relative max-w-[90%] rounded-2xl px-5 py-3 shadow-sm ${
                      isMe ? 'bg-indigo-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700'
                    }`}>
                      {isEditing ? (
                        <div className="space-y-3 min-w-[240px]">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full rounded-xl border-none bg-white/20 p-3 text-sm text-white placeholder-white/50 focus:ring-2 focus:ring-white/30 outline-none"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingCommentId(null)} className="text-[10px] font-black uppercase tracking-widest hover:underline opacity-70">Cancel</button>
                            <button onClick={() => onUpdateComment(comment.id)} className="text-[10px] font-black uppercase tracking-widest hover:underline">Update</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm leading-relaxed font-medium">{comment.message}</p>
                          {isMe && (
                            <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.message); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition" title="Edit"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                              <button onClick={() => onDeleteComment(comment.id)} className="p-2 rounded-xl hover:bg-rose-50 text-rose-400 transition" title="Delete"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className={`mt-2 flex items-center gap-2 px-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isMe ? 'You' : (comment.createdBy || 'User')}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400 font-medium">{formatDateTime(comment.createdAt)}</span>
                    </div>
                  </div>
                )
              }) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <span className="material-symbols-outlined text-4xl mb-2">forum</span>
                  <p className="text-xs font-bold uppercase tracking-widest">No conversation yet</p>
                </div>
              )}
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                onAddComment()
              }}
            >
              <textarea
                value={commentText}
                onChange={(event) => onCommentTextChange(event.target.value)}
                rows={3}
                placeholder="Message the reporter..."
                className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isCommentSubmitting || !commentText.trim()}
                  className="px-8"
                >
                  {isCommentSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </form>
          </section>
        </div>

        <div className="mt-8 flex flex-col gap-6 border-t border-slate-100 pt-8">
          {ticket.status === 'IN_PROGRESS' && (
            <div className="space-y-4 rounded-3xl bg-emerald-50/50 p-6 border border-emerald-100 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-500 text-[24px]">verified</span>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">Resolution Statement</p>
              </div>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain the solution applied..."
                className="w-full rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-emerald-500/10"
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  onClick={onResolve}
                  disabled={isActionProcessing || !resolutionNotes.trim()}
                  className="px-10"
                >
                  Confirm & Close
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end">
            <Button variant="outline" onClick={onClose} className="px-10">
              Exit Management
            </Button>
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

function TechnicianTicketsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, user, logout, syncProfile, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [profile, setProfile] = useState(user)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [attachmentUrls, setAttachmentUrls] = useState({})
  const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false)
  const [isActionProcessing, setIsActionProcessing] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      setLoadingProfile(true)
      setProfileError('')

      try {
        const response = await apiClient.get('/api/v1/users/me')
        if (!isMounted) {
          return
        }

        setProfile(response.data)
        syncProfile(response.data)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setProfileError(getApiErrorMessage(error))
      } finally {
        if (isMounted) {
          setLoadingProfile(false)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [getApiErrorMessage, syncProfile])

  const loadTickets = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await getTechnicianTickets()
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
          const signed = await getTechnicianTicketAttachmentUrl(ticketData.id, key)
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
    const data = await getTechnicianTicketById(ticketId)
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

  const handleResolveTicket = async () => {
    if (!resolutionNotes.trim() || !selectedTicket?.id) return

    setIsActionProcessing(true)
    setErrorMessage('')
    try {
      await resolveTechnicianTicket(selectedTicket.id, resolutionNotes.trim())
      
      // Notify the user about ticket resolution
      const targetUserId = selectedTicket.userId;
      if (targetUserId) {
        try {
          await sendAdminTestNotification({
            recipientUserId: targetUserId,
            title: 'Ticket Resolved',
            message: `Your ticket "${selectedTicket.title}" has been resolved by a technician.`,
            actionUrl: '/dashboard/user/tickets',
            category: 'TICKET'
          });
        } catch (e) { console.error(e); }
      }

      await loadTickets()
      setResolutionNotes('')
      setDetailsOpen(false)
      setResolutionNotes('')
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsActionProcessing(false)
    }
  }

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    progress: tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
  }), [tickets])

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
        <UserDashboardHeader eyebrow={headerLabels.eyebrow} title="Assigned Tickets" />

        <main className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8">
          {profileError ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <section className="mb-8 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  Hello, {loadingProfile ? 'Technician' : profile?.fullName || 'Technician'}!
                </h2>
                <p className="mt-2 text-indigo-100/70 max-w-md font-medium">
                  Operational Hub: Tracking {stats.open} open issues and {stats.progress} active resolutions.
                </p>
              </div>
              <Button 
                onClick={loadTickets} 
                className="bg-indigo-500/20 text-white border border-indigo-400/30 hover:bg-indigo-500/40 shadow-lg shadow-indigo-500/10 backdrop-blur-sm"
              >
                <span className="material-symbols-outlined mr-2">refresh</span> Refresh Worklist
              </Button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Assigned</p>
              <h3 className="text-3xl font-black text-slate-900">{isLoading ? '—' : stats.total}</h3>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Open Status</p>
              <h3 className="text-3xl font-black text-amber-600">{isLoading ? '—' : stats.open}</h3>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Active Labor</p>
              <h3 className="text-3xl font-black text-indigo-600">{isLoading ? '—' : stats.progress}</h3>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Successes</p>
              <h3 className="text-3xl font-black text-emerald-600">{isLoading ? '—' : stats.resolved}</h3>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Queue</h3>
              <p className="text-sm font-medium text-slate-500">Tickets assigned for immediate intervention and resolution.</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ticket</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>Loading tickets...</td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                        Assigned tickets coming soon.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{ticket.title || `Ticket #${ticket.id}`}</div>
                          <p className="mt-1 max-w-xl truncate text-xs text-slate-500">{ticket.description || '-'}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{ticket.userEmail || ticket.userId || '-'}</td>
                        <td className="px-4 py-4 text-slate-700">{ticket.priority || '-'}</td>
                        <td className="px-4 py-4"><TicketBadge status={ticket.status} /></td>
                        <td className="px-4 py-4 text-slate-600">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTicket(ticket)}
                            disabled={processingId === ticket.id}
                            className="rounded-xl font-black uppercase tracking-widest text-[10px]"
                          >
                            Inspect
                          </Button>
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

      <TechnicianTicketDetailsModal
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
        onResolve={handleResolveTicket}
        isActionProcessing={isActionProcessing}
        resolutionNotes={resolutionNotes}
        setResolutionNotes={setResolutionNotes}
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

export default TechnicianTicketsPage
