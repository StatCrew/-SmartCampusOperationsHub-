import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import apiClient from '../../../api/authService'
import { createTicketComment, getTechnicianTicketAttachmentUrl, getTechnicianTicketById, getTechnicianTickets } from '../../../api/ticketApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
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
}) {
  if (!open || !ticket) return null
  const comments = Array.isArray(ticket.comments) ? ticket.comments : []
  const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assigned Ticket</p>
            <h3 className="text-xl font-bold text-slate-900">{ticket.title || `Ticket #${ticket.id}`}</h3>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100">×</button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Detail label="Status" value={<TicketBadge status={ticket.status} />} />
          <Detail label="Priority" value={ticket.priority || '-'} />
          <Detail label="Category" value={ticket.category || '-'} />
          <Detail label="Contact Number" value={ticket.contactNumber || '-'} />
          <Detail label="Reported By" value={ticket.userEmail || ticket.userId || '-'} />
          <Detail label="Created" value={formatDateTime(ticket.createdAt)} />
          <Detail label="Ticket ID" value={ticket.id} />
          <div className="md:col-span-2 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Description</p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{ticket.description || '-'}</div>
          </div>
          <div className="md:col-span-2 space-y-2">
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
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Discussion History</p>
              <span className="text-xs font-semibold text-slate-400">{comments.length} message{comments.length === 1 ? '' : 's'}</span>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {comments.length > 0 ? comments.map((comment) => (
                <div key={comment.id} className={`flex ${String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase() ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase() ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
                    <div className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase() ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {comment.createdBy || comment.userEmail || 'Support user'}
                    </div>
                    <p className="text-sm">{comment.message}</p>
                    <div className={`mt-1 text-[10px] ${String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase() ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {formatDateTime(comment.createdAt)}
                    </div>
                  </div>
                </div>
              )) : <div className="text-sm text-slate-500">No history yet.</div>}
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
                placeholder="Write a message to the technician..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isCommentSubmitting || !commentText.trim()}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCommentSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{value}</div>
    </div>
  )
}

function TechnicianTicketsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, user, logout, syncProfile, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
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

          <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Hello, {loadingProfile ? 'Technician' : profile?.fullName || 'Technician'}!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Track assigned work, priorities, and progress updates from one place.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Assigned</p>
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">My Ticket Queue</h3>
                <p className="text-sm text-slate-600">Tickets assigned to you for handling and follow-up.</p>
              </div>
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
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleViewTicket(ticket)}
                            disabled={processingId === ticket.id}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            View
                          </button>
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
      />
    </div>
  )
}

export default TechnicianTicketsPage



