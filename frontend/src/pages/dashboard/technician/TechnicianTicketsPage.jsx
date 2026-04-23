import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import apiClient from '../../../api/authService'
import { createTicketComment, deleteTicketComment, getTechnicianTicketAttachmentUrl, getTechnicianTicketById, getTechnicianTickets, resolveTechnicianTicket, updateTicketComment } from '../../../api/ticketApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

const STATUS_META = {
  OPEN: { label: 'Open', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  CLOSED: { label: 'Closed', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
}

function formatDateTime(value) {
  if (!value) return '-'
  try { return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) } catch { return String(value) }
}

function isImageAttachment(fileUrl) {
  return /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(String(fileUrl || ''))
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
      border: 'border-red-100',
    }
  }

  return {
    text: `Due in ${hours}h ${mins}m`,
    color: hours < 4 ? 'text-amber-600' : 'text-emerald-600',
    icon: 'schedule',
    bg: hours < 4 ? 'bg-amber-50' : 'bg-emerald-50',
    border: hours < 4 ? 'border-amber-100' : 'border-emerald-100',
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

function InfoCard({ label, children, icon }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 group">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="material-symbols-outlined text-[18px] text-indigo-500 opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span>}
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-indigo-500 transition-colors">{label}</p>
      </div>
      <div className="text-sm font-bold text-slate-700 leading-relaxed">
        {children}
      </div>
    </div>
  )
}

function DetailItem({ label, value, icon }) {
  return (
    <div className="flex items-center gap-3 py-1">
      {icon && <span className="material-symbols-outlined text-[18px] text-slate-400">{icon}</span>}
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">{label}</p>
        <p className="text-xs font-bold text-slate-700">{value || '-'}</p>
      </div>
    </div>
  )
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
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-6xl rounded-[2.5rem] bg-white p-8 lg:p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-y-auto max-h-[92vh] no-scrollbar">
        {/* Header Section */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-start gap-5">
            <div className="grid h-14 w-14 lg:h-16 lg:w-16 place-items-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20">
              <span className="material-symbols-outlined text-[32px] lg:text-[36px]">confirmation_number</span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <TicketBadge status={ticket.status} />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">TICKET #{ticket.id}</span>
              </div>
              <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {ticket.title || `Ticket #${ticket.id}`}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {sla && ticket.status === 'IN_PROGRESS' && (
              <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold ${sla.bg} ${sla.color} ${sla.border} animate-pulse shadow-sm`}>
                <span className="material-symbols-outlined text-[18px]">{sla.icon}</span>
                <span className="uppercase tracking-widest">{sla.text}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400 transition-all duration-300 hover:bg-red-50 hover:text-red-500 hover:rotate-90 shadow-sm border border-slate-100"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Information Cards */}
          <div className="lg:col-span-7 space-y-6">

            {/* Request Context Card */}
            <InfoCard label="Issue Investigation" icon="find_in_page">
              <div className="whitespace-pre-wrap leading-relaxed text-slate-600 font-semibold italic border-l-4 border-indigo-200 pl-4 py-1 mt-2">
                {ticket.description || 'No description provided.'}
              </div>
            </InfoCard>

            {/* Resolution History Alert */}
            {ticket.status === 'RESOLVED' && (
              <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 p-5 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-600">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Resolution Notes</p>
                </div>
                <p className="text-sm text-emerald-800 font-bold leading-relaxed ml-1">{ticket.resolutionNotes || 'Task completed as requested.'}</p>
              </div>
            )}

            {/* Technical Details Card */}
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/20 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 ml-1">
                <span className="material-symbols-outlined text-indigo-500 text-[20px]">inventory</span>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Assignment Metadata</p>
              </div>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <DetailItem label="Current Status" value={<TicketBadge status={ticket.status} />} icon="info" />
                <DetailItem label="Priority Level" value={ticket.priority} icon="priority_high" />
                <DetailItem label="Service Category" value={ticket.category} icon="category" />
                <DetailItem label="Contact Number" value={ticket.contactNumber} icon="call" />
                <DetailItem label="Reported By" value={ticket.userEmail || ticket.userId} icon="person" />
                <DetailItem label="Created At" value={formatDateTime(ticket.createdAt)} icon="event" />
                <DetailItem label="Last Update" value={formatDateTime(ticket.updatedAt)} icon="update" />
                <DetailItem label="System ID" value={ticket.id} icon="tag" />
              </div>
            </div>

            {/* Visual Evidence Card */}
            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500 text-[20px]">photo_library</span>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Attached Evidence</p>
                </div>
                {attachments.length > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{attachments.length} Files</span>
                )}
              </div>

              {attachments.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {attachments.map((attachment, index) => {
                    const isImg = isImageAttachment(attachment)
                    const url = attachmentUrls?.[attachment]

                    return (
                      <div key={`${attachment}-${index}`} className="group relative aspect-square rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        {isImg ? (
                          <div className="relative h-full w-full overflow-hidden rounded-[1.25rem] bg-slate-100">
                            {url ? (
                              <img
                                src={url}
                                alt={`Evidence ${index + 1}`}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
                              </div>
                            )}
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            >
                              <span className="material-symbols-outlined text-white text-[24px]">zoom_in</span>
                            </a>
                          </div>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[1.25rem] bg-slate-50 text-slate-400">
                            <span className="material-symbols-outlined text-[32px]">description</span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-indigo-600 px-3 py-1 text-[9px] font-black text-white uppercase tracking-wider transition hover:bg-indigo-700"
                            >
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 flex flex-col items-center justify-center text-center opacity-70">
                  <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                    <span className="material-symbols-outlined text-slate-300 text-[32px]">no_photography</span>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No evidence available</p>
                </div>
              )}
            </div>

            {/* Technician Actions Section */}
            {ticket.status === 'IN_PROGRESS' && (
              <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl shadow-slate-900/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">task_alt</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Resolution Reporting</p>
                </div>

                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Document the actions taken to resolve this issue..."
                    className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-sm font-semibold text-white placeholder:text-white/30 outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onResolve}
                      disabled={isActionProcessing || !resolutionNotes.trim()}
                      className="rounded-xl bg-emerald-600 px-8 py-3.5 text-[11px] font-black text-white uppercase tracking-widest transition-all duration-300 hover:bg-emerald-500 hover:scale-105 active:scale-95 disabled:opacity-40 shadow-lg shadow-emerald-600/20"
                    >
                      Confirm Resolution
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Discussion / Chat Panel */}
          <div className="lg:col-span-5 flex flex-col h-full space-y-5">
            <div className="flex items-center justify-between ml-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500 text-[20px]">question_answer</span>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">User Dialogue</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {comments.length} message{comments.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex-1 flex flex-col bg-slate-50/50 rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-inner min-h-[500px]">
              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {comments.length > 0 ? (
                  comments.map((comment) => {
                    const isMe = String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase()
                    const isEditing = editingCommentId === comment.id

                    return (
                      <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`relative max-w-[85%] rounded-[1.5rem] p-4 shadow-sm transition-all duration-300 ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                          }`}>
                          {isEditing ? (
                            <div className="space-y-3 min-w-[200px]">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="w-full rounded-xl bg-black/5 p-3 text-sm font-semibold outline-none focus:bg-black/10 transition-all resize-none text-inherit"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex justify-end gap-3">
                                <button onClick={() => setEditingCommentId(null)} className="text-[10px] font-black uppercase tracking-widest opacity-70 hover:opacity-100">Cancel</button>
                                <button onClick={() => onUpdateComment(comment.id)} className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30">Save</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-bold leading-relaxed pr-6">{comment.message}</p>
                              <div className={`flex items-center gap-2 mt-2 opacity-50 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span className="text-[9px] font-black tracking-widest uppercase">
                                  {formatDateTime(comment.createdAt).split(',')[1]?.trim() || formatDateTime(comment.createdAt)}
                                </span>
                                {isMe && <span className="material-symbols-outlined text-[14px]">done_all</span>}
                              </div>

                              {isMe && !isEditing && (
                                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(comment.id)
                                      setEditingCommentText(comment.message)
                                    }}
                                    className="p-1 rounded-full bg-black/10 hover:bg-black/20 text-white"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                  </button>
                                  <button
                                    onClick={() => onDeleteComment(comment.id)}
                                    className="p-1 rounded-full bg-black/10 hover:bg-red-500 text-white"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {!isMe && (
                          <span className="mt-1.5 ml-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Reported User
                          </span>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <div className="h-20 w-20 rounded-[2rem] bg-white flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                      <span className="material-symbols-outlined text-slate-300 text-[40px]">forum</span>
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">No dialogue recorded</p>
                  </div>
                )}
              </div>

              {/* Chat Input Area */}
              {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
                <div className="p-4 bg-white border-t border-slate-100">
                  <form
                    className="relative flex items-end gap-3"
                    onSubmit={(event) => {
                      event.preventDefault()
                      onAddComment()
                    }}
                  >
                    <div className="relative flex-1">
                      <textarea
                        value={commentText}
                        onChange={(event) => onCommentTextChange(event.target.value)}
                        rows={1}
                        placeholder="Update the reporter..."
                        className="w-full rounded-[1.5rem] bg-slate-50 px-6 py-4 text-sm font-bold text-slate-700 outline-none transition-all focus:bg-white focus:ring-[10px] focus:ring-indigo-500/5 focus:border-indigo-200 border border-transparent max-h-32 resize-none"
                        style={{ height: 'auto', minHeight: '52px' }}
                        onInput={(e) => {
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isCommentSubmitting || !commentText.trim()}
                      className="grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 transition-all duration-300 hover:bg-indigo-700 hover:scale-110 active:scale-95 disabled:opacity-40 disabled:scale-100"
                    >
                      {isCommentSubmitting ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <span className="material-symbols-outlined text-[24px]">send</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
          <p className="text-[10px] font-bold italic text-slate-400 tracking-tight">
            * Technician View: Professional grade incident resolution.
          </p>
          <div />
        </div>
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
    } catch {
      setAttachmentUrls({})
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
      await loadTickets()
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
        <UserDashboardHeader eyebrow={headerLabels.eyebrow} title="Tickets" />

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

          <section className="mb-6 rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
               Welcome, {loadingProfile ? 'Technician' : profile?.fullName || 'Technician'}!
             </h2>
             <p className="mt-3 text-sm font-semibold text-slate-500 leading-relaxed max-w-2xl">
               Review assigned tickets, add updates, and close completed work.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total', val: stats.total, color: 'text-slate-900', icon: 'assignment' },
              { label: 'Open', val: stats.open, color: 'text-amber-600', icon: 'pending' },
              { label: 'Working', val: stats.progress, color: 'text-indigo-600', icon: 'handyman' },
              { label: 'Done', val: stats.resolved, color: 'text-emerald-600', icon: 'task_alt' },
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

          <section className="mt-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Assigned Tickets</h3>
            </div>

            {isLoading ? (
              <div className="py-24 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-400">Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                <span className="material-symbols-outlined text-slate-300 text-6xl">upcoming</span>
                <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-400">No tickets assigned.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tickets.map((ticket) => {
                  const sla = getSLADisplay(ticket.dueDate)
                  return (
                    <div
                      key={ticket.id}
                      className="group relative flex flex-col rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all duration-500 hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <TicketBadge status={ticket.status} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">ID: {ticket.id}</span>
                      </div>

                      <h4 className="text-xl font-black text-slate-900 tracking-tight line-clamp-1 mb-2 group-hover:text-indigo-600 transition-colors">
                        {ticket.title || `Ticket #${ticket.id}`}
                      </h4>
                      <p className="text-xs font-semibold text-slate-500 line-clamp-2 mb-6 min-h-[32px]">
                        {ticket.description || 'No description provided.'}
                      </p>

                      <div className="mt-auto space-y-4">
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Reporter</p>
                            <p className="text-[11px] font-bold text-slate-700 truncate">{ticket.userEmail || ticket.userId || 'Anonymous'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Priority</p>
                            <p className={`text-[11px] font-black uppercase tracking-widest ${ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? 'text-red-600' : 'text-slate-700'
                              }`}>{ticket.priority || 'MEDIUM'}</p>
                          </div>
                        </div>

                        {sla && ticket.status === 'IN_PROGRESS' && (
                          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${sla.bg} ${sla.color} ${sla.border}`}>
                            <span className="material-symbols-outlined text-[16px]">{sla.icon}</span>
                            {sla.text}
                          </div>
                        )}

                        <button
                          onClick={() => handleViewTicket(ticket)}
                          disabled={processingId === ticket.id}
                          className="w-full rounded-xl bg-slate-900 py-3.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-indigo-600 hover:shadow-[0_12px_24px_-8px_rgba(79,70,229,0.4)]"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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
        }}
        onAddComment={handleAddComment}
        commentText={commentText}
        onCommentTextChange={setCommentText}
        isCommentSubmitting={isCommentSubmitting}
        attachmentUrls={attachmentUrls}
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