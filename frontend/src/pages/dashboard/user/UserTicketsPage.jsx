import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from './components/UserDashboardHeader'
import UserSidebar from './components/UserSidebar'
import useTickets from './hooks/useTickets'

import TicketFormModal from './components/TicketFormModal'
import TicketDetailsModal from './components/TicketDetailsModal'
import { Button } from '../../../components/ui/Button'

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
    errorMessage,
    successMessage,
    search,
    setSearch,
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
          <UserDashboardHeader
            onLogout={handleLogout}
            eyebrow="Academic Support"
            title="Service Hub"
          />

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