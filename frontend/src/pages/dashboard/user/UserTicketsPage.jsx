import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createTicket, createTicketComment, deleteTicket, getUserTicketAttachmentUrl, getUserTicketById, getUserTickets, updateTicket } from '../../../api/ticketApi'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'

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
  if (!value) {
    return '-'
  }

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

function TicketFormModal({ open, mode, ticket, onClose, onSaved, getApiErrorMessage }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    resourceId: '',
  })
  const [files, setFiles] = useState([])

  useEffect(() => {
    if (!open) {
      return
    }

    setErrorMessage('')
    setIsSubmitting(false)
    setFormData({
      title: ticket?.title || '',
      description: ticket?.description || '',
      category: ticket?.category || 'GENERAL',
      priority: ticket?.priority || 'MEDIUM',
      resourceId: ticket?.resourceId ? String(ticket.resourceId) : '',
    })
    setFiles([])
  }, [open, ticket, mode])

  if (!open) {
    return null
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        resourceId: formData.resourceId ? Number(formData.resourceId) : null,
      }

      if (mode === 'edit' && ticket?.id) {
        await updateTicket(ticket.id, payload, files)
      } else {
        await createTicket(payload, files)
      }

      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Support Desk</p>
            <h3 className="text-xl font-bold text-slate-900">{mode === 'edit' ? 'Edit Ticket' : 'Create Ticket'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Title</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Short summary of the issue"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Explain the issue in detail"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="GENERAL">General</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="NETWORK">Network</option>
              <option value="FACILITY">Facility</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Resource ID</label>
            <input
              name="resourceId"
              value={formData.resourceId}
              onChange={handleChange}
              type="number"
              min="1"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Attachments</label>
            <input
              type="file"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
            />
            <p className="text-xs text-slate-500">Optional. Attach images or documents to support the report.</p>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : mode === 'edit' ? 'Save Changes' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TicketDetailsModal({
  open,
  ticket,
  onClose,
  onEdit,
  onDelete,
  onAddComment,
  commentText,
  onCommentTextChange,
  isDeleting,
  isCommentSubmitting,
  attachmentUrls,
  isAttachmentsLoading,
  currentUserEmail,
}) {
  if (!open || !ticket) {
    return null
  }

  const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : []
  const comments = Array.isArray(ticket.comments) ? ticket.comments : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl rounded-3xl bg-white p-6 shadow-2xl">
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
            <button
              type="button"
              onClick={() => onEdit(ticket)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-200 text-indigo-600 transition hover:bg-indigo-50"
              title="Edit ticket"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(ticket)}
              disabled={isDeleting}
              className="grid h-10 w-10 place-items-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              title="Delete ticket"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Detail label="Status" value={<TicketBadge status={ticket.status} />} />
              <Detail label="Priority" value={ticket.priority || '-'} />
              <Detail label="Category" value={ticket.category || '-'} />
              <Detail label="Resource ID" value={ticket.resourceId ?? '-'} />
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
                      {comment.createdBy || comment.userEmail || 'Support user'}
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
                placeholder="Write a message to the technician..."
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

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
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

function UserTicketsPage() {
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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [activeTicket, setActiveTicket] = useState(null)
  const [previewTicket, setPreviewTicket] = useState(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [processingId, setProcessingId] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [attachmentUrls, setAttachmentUrls] = useState({})
  const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false)

  const loadTickets = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await getUserTickets()
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

  const openCreateTicket = () => {
    setFormMode('create')
    setActiveTicket(null)
    setIsFormOpen(true)
  }

  const closeTicketForm = () => {
    setIsFormOpen(false)
    setActiveTicket(null)
  }

  const closeTicketDetails = () => {
    setIsDetailsOpen(false)
    setPreviewTicket(null)
    setCommentText('')
    setAttachmentUrls({})
    setIsAttachmentsLoading(false)
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
          const signed = await getUserTicketAttachmentUrl(ticketData.id, key)
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
    const data = await getUserTicketById(ticketId)
    setPreviewTicket(data || null)
    setCommentText('')
    await loadAttachmentUrls(data)
    return data || null
  }, [loadAttachmentUrls])

  const handleViewTicket = async (ticket) => {
    setProcessingId(ticket.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await loadTicketDetails(ticket.id)
      setIsDetailsOpen(true)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  const handleEditTicket = async (ticket) => {
    setProcessingId(ticket.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const data = await getUserTicketById(ticket.id)
      setActiveTicket(data || ticket)
      setFormMode('edit')
      setIsFormOpen(true)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
    }
  }

  const handleEditFromDetails = async (ticket) => {
    closeTicketDetails()
    await handleEditTicket(ticket)
  }

  const handleAddComment = async () => {
    if (!previewTicket?.id || !commentText.trim()) {
      return
    }

    setIsCommentSubmitting(true)
    setErrorMessage('')

    try {
      await createTicketComment(previewTicket.id, commentText.trim())
      await loadTicketDetails(previewTicket.id)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsCommentSubmitting(false)
    }
  }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter
      const matchesSearch = !q || [ticket.title, ticket.description, ticket.category, ticket.priority]
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

  const handleDelete = async (ticket) => {
    const confirmed = window.confirm(`Delete ticket #${ticket.id}?`)
    if (!confirmed) {
      return
    }

    setProcessingId(ticket.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deleteTicket(ticket.id)
      if (previewTicket?.id === ticket.id) {
        closeTicketDetails()
      }
      setSuccessMessage('Ticket deleted successfully.')
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
        <UserDashboardHeader eyebrow="Student Support" title="My Tickets" />

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
                <h2 className="text-2xl font-bold text-slate-900">Support Requests</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Track maintenance issues, follow progress, and create new requests from here.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateTicket}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Create Ticket
              </button>
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
                placeholder="Search tickets"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 md:max-w-sm"
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
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>Loading tickets...</td>
                    </tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                        No tickets found.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{ticket.title || `Ticket #${ticket.id}`}</div>
                          <p className="mt-1 max-w-xl truncate text-xs text-slate-500">{ticket.description || '-'}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{ticket.category || '-'}</td>
                        <td className="px-4 py-4 text-slate-700">{ticket.priority || '-'}</td>
                        <td className="px-4 py-4"><TicketBadge status={ticket.status} /></td>
                        <td className="px-4 py-4 text-slate-600">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '-'}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewTicket(ticket)}
                              disabled={processingId === ticket.id}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditTicket(ticket)}
                              disabled={processingId === ticket.id}
                              className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(ticket)}
                              disabled={processingId === ticket.id}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === ticket.id ? 'Working...' : 'Delete'}
                            </button>
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

      <TicketFormModal
        open={isFormOpen}
        mode={formMode}
        ticket={activeTicket}
        onClose={closeTicketForm}
        onSaved={loadTickets}
        getApiErrorMessage={getApiErrorMessage}
      />

      <TicketDetailsModal
        open={isDetailsOpen}
        ticket={previewTicket}
        onClose={closeTicketDetails}
        onEdit={handleEditFromDetails}
        onDelete={handleDelete}
        onAddComment={handleAddComment}
        commentText={commentText}
        onCommentTextChange={setCommentText}
        isDeleting={processingId === previewTicket?.id}
        isCommentSubmitting={isCommentSubmitting}
        attachmentUrls={attachmentUrls}
        isAttachmentsLoading={isAttachmentsLoading}
        currentUserEmail={user?.email}
      />
    </div>
  )
}

export default UserTicketsPage


