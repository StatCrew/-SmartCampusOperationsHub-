import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createTicket, createTicketComment, deleteTicket, getUserTicketAttachmentUrl, getUserTicketById, getUserTickets, updateTicket, rateUserTicket } from '../../../api/ticketApi'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'
import useTickets from './hooks/useTickets'

import TicketFormModal from './components/TicketFormModal'
import TicketDetailsModal from './components/TicketDetailsModal'

const STATUS_META = {
  OPEN: { label: 'Open', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CLOSED: { label: 'Closed', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
}

export function TicketBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.OPEN
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${meta.bg} ${meta.text} ${meta.border}`}>
      {meta.label}
    </span>
  )
}

export function formatDateTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

export function extractStorageKey(fileUrl) {
  if (!fileUrl) return null
  try {
    const parsed = new URL(fileUrl)
    return parsed.pathname?.replace(/^\//, '') || null
  } catch {
    return fileUrl
  }
}

export function isImageAttachment(fileUrl) {
  return /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(String(fileUrl || ''))
}

function UserTicketsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, user, logout, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

  const {
    filteredTickets,
    isLoading,
    errorMessage,
    successMessage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    isFormOpen,
    formMode,
    activeTicket,
    isDetailsOpen,
    previewTicket,
    processingId,
    commentText,
    setCommentText,
    isCommentSubmitting,
    attachmentUrls,
    isAttachmentsLoading,
    isActionProcessing,
    stats,
    loadTickets,
    openCreateTicket,
    closeTicketForm,
    closeTicketDetails,
    handleViewTicket,
    handleEditFromDetails,
    handleDelete,
    handleAddComment,
    handleUpdateComment,
    handleDeleteComment,
    handleRateTicket,
    editingCommentId,
    setEditingCommentId,
    editingCommentText,
    setEditingCommentText,
  } = useTickets(getApiErrorMessage)

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  const handleDeleteFromDetails = async (ticket) => {
    await handleDelete(ticket)
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
        onDelete={handleDeleteFromDetails}
        onAddComment={handleAddComment}
        commentText={commentText}
        onCommentTextChange={setCommentText}
        isDeleting={processingId === previewTicket?.id}
        isCommentSubmitting={isCommentSubmitting}
        attachmentUrls={attachmentUrls}
        isAttachmentsLoading={isAttachmentsLoading}
        currentUserEmail={user?.email}
        onRate={handleRateTicket}
        isActionProcessing={isActionProcessing}
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
