import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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

function TicketBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.OPEN
  return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${meta.bg} ${meta.text} ${meta.border}`}>
      {meta.label}
    </span>
  )
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
      () => getSidebarItemsByRole(role).map((item) => ({
        ...item,
        active: item.path === location.pathname,
      })),
      [location.pathname, role]
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
            {errorMessage && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
            )}

            {successMessage && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
            )}

            {/* Header */}
            <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Support Requests</h2>
                  <p className="text-sm text-slate-600 mt-2">
                    Track issues and create requests.
                  </p>
                </div>

                <button
                    onClick={openCreateTicket}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
                >
                  Create Ticket
                </button>
              </div>
            </section>

            {/* Stats */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total" value={stats.total} />
              <StatCard title="Open" value={stats.open} />
              <StatCard title="Progress" value={stats.progress} />
              <StatCard title="Resolved" value={stats.resolved} />
            </section>

            {/* Table */}
            <section className="mt-6 bg-white p-6 rounded-2xl shadow-sm">
              <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="mb-4 w-full md:w-80 border px-3 py-2 rounded"
              />

              <table className="w-full text-sm">
                <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Status</th>
                  <th></th>
                </tr>
                </thead>

                <tbody>
                {filteredTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{ticket.title}</td>
                      <td><TicketBadge status={ticket.status} /></td>
                      <td>
                        <button onClick={() => handleViewTicket(ticket)}>
                          View
                        </button>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </section>
          </main>
        </div>

        {/* Modals */}
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

function StatCard({ title, value }) {
  return (
      <div className="bg-white p-4 rounded shadow">
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="text-xl font-bold">{value}</h3>
      </div>
  )
}

export default UserTicketsPage