import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { closeAdminTicket, createTicketComment, deleteTicketComment, getAdminTicketAttachmentUrl, getAdminTicketById, getAdminTickets, markAdminTicketInProgress, rejectAdminTicket, updateTicketComment } from '../../../api/ticketApi'
import { sendAdminTestNotification } from '../../../api/adminApi'
import { assignAdminTicket, closeAdminTicket, createTicketComment, deleteTicketComment, getAdminTicketAttachmentUrl, getAdminTicketById, getAdminTickets, markAdminTicketInProgress, rejectAdminTicket, updateTicketComment } from '../../../api/ticketApi'
import { getUsers } from '../../../api/adminApi'
import useAuth from '../../../context/useAuth'
import { getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

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

function TicketDetailsModal({
  open,
  ticket,
  onClose,
  onAddComment,
  commentText,
  onCommentTextChange,
  isCommentSubmitting,
  attachmentUrls,
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
  onUpdateStatus,
}) {
  const [showReject, setShowReject] = useState(false)

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
              <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-3 mb-1.5">
                <TicketBadge status={ticket.status} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ref: #{ticket.id}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">TICKET #{ticket.id}</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{ticket.title || `Ticket #${ticket.id}`}</h3>
              <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {ticket.title || `Ticket #${ticket.id}`}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">

          <div className="flex items-center gap-3">
            {sla && ticket.status === 'OPEN' && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest ${sla.bg} ${sla.color} border border-current/10 animate-pulse`}>
              <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold ${sla.bg} ${sla.color} ${sla.border} animate-pulse shadow-sm`}>
                <span className="material-symbols-outlined text-[18px]">{sla.icon}</span>
                <span className="uppercase tracking-widest">{sla.text}</span>
              </div>
            )}
            <Button variant="outline" onClick={onClose} className="w-11 h-11 !p-0 rounded-2xl">
              <span className="material-symbols-outlined">close</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400 transition-all duration-300 hover:bg-red-50 hover:text-red-500 hover:rotate-90 shadow-sm border border-slate-100"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className="space-y-8">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Problem Description</p>
              <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner font-medium">
                {ticket.description || 'No description provided.'}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Information Cards */}
          <div className="lg:col-span-7 space-y-6">

            {/* Request Context Card */}
            <InfoCard label="Request Description" icon="description">
              <div className="whitespace-pre-wrap leading-relaxed text-slate-600 font-semibold italic border-l-4 border-indigo-200 pl-4 py-1 mt-2">
                {ticket.description || 'No description provided.'}
              </div>
            </InfoCard>

            {/* Rejection Alert */}
            {ticket.status === 'REJECTED' && (
              <div className="rounded-2xl border-2 border-red-100 bg-red-50/30 p-5 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-100 text-red-600">
                    <span className="material-symbols-outlined text-[20px]">error</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-700">Rejection Reason</p>
                </div>
                <p className="text-sm text-red-800 font-bold leading-relaxed ml-1">{ticket.rejectionReason || 'No specific reason provided.'}</p>
              </div>
            )}

            {ticket.status === 'REJECTED' && (
              <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-rose-500 text-[24px]">report</span>
                  <p className="text-[11px] font-black uppercase tracking-widest text-rose-700">Administrative Decision</p>
                </div>
                <p className="text-sm text-rose-800 font-bold leading-relaxed">{ticket.rejectionReason || 'No reason provided.'}</p>
            {/* Technical Details Card */}
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/20 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 ml-1">
                <span className="material-symbols-outlined text-indigo-500 text-[20px]">analytics</span>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Management Details</p>
              </div>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <DetailItem label="Status" value={<TicketBadge status={ticket.status} />} icon="info" />
                <DetailItem label="Priority Level" value={ticket.priority} icon="priority_high" />
                <DetailItem label="Service Category" value={ticket.category} icon="category" />
                <DetailItem label="Contact Number" value={ticket.contactNumber} icon="call" />
                <DetailItem label="Reported By" value={ticket.userEmail || ticket.userId} icon="person" />
                <DetailItem label="Assigned Tech" value={ticket.technicianEmail || 'Unassigned'} icon="engineering" />
                <DetailItem label="Created At" value={formatDateTime(ticket.createdAt)} icon="event" />
                <DetailItem label="Last Update" value={formatDateTime(ticket.updatedAt)} icon="update" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail label="Status" value={<TicketBadge status={ticket.status} />} />
              <Detail label="Priority" value={ticket.priority || 'Medium'} />
              <Detail label="Category" value={ticket.category || 'General'} />
              <Detail label="Contact" value={ticket.contactNumber || '-'} />
              <Detail label="Reporter" value={ticket.userEmail || ticket.userId || '-'} />
              <Detail label="Technician" value={ticket.technicianEmail || 'Pending Assignment'} />
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Evidence {attachments.length > 0 && `(${attachments.length})`}</p>
            {/* Visual Evidence Card */}
            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500 text-[20px]">gallery_thumbnail</span>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Visual Evidence</p>
                </div>
                {attachments.length > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{attachments.length} Files</span>
                )}
              </div>

              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {attachments.map((attachment, index) => {
                    const isImg = isImageAttachment(attachment)
                    const url = attachmentUrls?.[attachment]

                    return (
                      <div key={`${attachment}-${index}`} className="group relative aspect-square rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <div key={`${attachment}-${index}`} className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-2.5 transition-all hover:border-indigo-300 hover:shadow-xl">
                        {isImg ? (
                          <div className="relative h-full w-full overflow-hidden rounded-[1.25rem] bg-slate-100">
                          <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-slate-100">
                            {url ? (
                              <img
                                src={url}
                                alt={`Evidence ${index + 1}`}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                              </div>
                            )}
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            >
                              <span className="material-symbols-outlined text-white text-[24px]">visibility</span>
                              <Button variant="primary" size="sm">View Fullscreen</Button>
                            </a>
                          </div>
                        ) : (
                          <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-[1.5rem] bg-slate-50 text-slate-400">
                            <span className="material-symbols-outlined text-5xl">description</span>
                            <p className="text-[10px] font-black uppercase tracking-widest">Document #{index + 1}</p>
                            <a href={url} target="_blank" rel="noreferrer">
                              <Button variant="outline" size="sm">Download</Button>
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[1.25rem] bg-slate-50 text-slate-400">
                            <span className="material-symbols-outlined text-[32px]">description</span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-indigo-600 px-3 py-1 text-[9px] font-black text-white uppercase tracking-wider transition hover:bg-indigo-700"
                            >
                              Open File
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
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 flex flex-col items-center justify-center text-center opacity-70">
                  <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                    <span className="material-symbols-outlined text-slate-300 text-[32px]">no_photography</span>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No evidence attached</p>
                </div>
              )}
              {isAttachmentsLoading ? <p className="text-[10px] text-slate-400 italic text-center">Renewing secure tokens...</p> : null}
            </div>

            {/* Admin Actions Section */}
            <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl shadow-slate-900/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">settings_suggest</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Admin Operations</p>
              </div>

              <div className="flex flex-wrap gap-4">
                {ticket.status === 'OPEN' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(ticket, 'IN_PROGRESS')}
                      disabled={isActionProcessing}
                      className="rounded-xl bg-indigo-600 px-8 py-3.5 text-[11px] font-black text-white uppercase tracking-widest transition-all duration-300 hover:bg-indigo-500 hover:scale-105 active:scale-95 disabled:opacity-40"
                    >
                      Assign & Start
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReject(!showReject)}
                      disabled={isActionProcessing}
                      className="rounded-xl bg-white/10 px-8 py-3.5 text-[11px] font-black text-white uppercase tracking-widest transition-all duration-300 hover:bg-red-500 hover:scale-105 active:scale-95 disabled:opacity-40 border border-white/10"
                    >
                      {showReject ? 'Cancel Reject' : 'Reject Request'}
                    </button>
                  </>
                )}
                {ticket.status === 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(ticket, 'CLOSED')}
                    disabled={isActionProcessing}
                    className="rounded-xl bg-emerald-600 px-8 py-3.5 text-[11px] font-black text-white uppercase tracking-widest transition-all duration-300 hover:bg-emerald-500 hover:scale-105 active:scale-95 disabled:opacity-40"
                  >
                    Close Ticket
                  </button>
                )}
              </div>

          <section className="flex flex-col rounded-[2.5rem] border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Communication Log</p>
              <Badge variant="neutral">{comments.length} Messages</Badge>
              {ticket.status === 'OPEN' && showReject && (
                <div className="mt-6 space-y-4 animate-in slide-in-from-top-4 duration-500">
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="State the reason for administrative rejection..."
                    className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-sm font-semibold text-white placeholder:text-white/30 outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onReject}
                      disabled={isActionProcessing || !rejectionReason.trim()}
                      className="rounded-xl bg-red-600 px-6 py-3 text-[10px] font-black text-white uppercase tracking-[0.2em] transition-all hover:bg-red-500 active:scale-95 disabled:opacity-40 shadow-lg shadow-red-600/20"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-5 no-scrollbar mb-6 min-h-[300px]">
              {comments.length > 0 ? comments.map((comment) => {
                const isMe = String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase()
                const isEditing = editingCommentId === comment.id
          </div>

          {/* Right Column: Discussion / Chat Panel */}
          <div className="lg:col-span-5 flex flex-col h-full space-y-5">
            <div className="flex items-center justify-between ml-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500 text-[20px]">forum</span>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Communication Thread</p>
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
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isMe ? 'Internal' : (comment.createdBy || 'Reporter')}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400 font-medium">{formatDateTime(comment.createdAt)}</span>
                    return (
                      <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`relative max-w-[85%] rounded-[1.5rem] p-4 shadow-sm transition-all duration-300 ${
                          isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
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
                            {comment.createdBy || 'Staff Support'}
                          </span>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <div className="h-20 w-20 rounded-[2rem] bg-white flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                      <span className="material-symbols-outlined text-slate-300 text-[40px]">chat_bubble</span>
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">No communication yet</p>
                  </div>
                )
              }) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <span className="material-symbols-outlined text-4xl mb-2">forum</span>
                  <p className="text-xs font-bold uppercase tracking-widest">No conversation yet</p>
                </div>
              )}
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
                placeholder="Compose a message..."
                className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isCommentSubmitting || !commentText.trim()}
                  className="px-8"
                >
                  {isCommentSubmitting ? 'Dispatching...' : 'Send Message'}
                </Button>
              </div>
            </form>
          </section>
        </div>

        <div className="mt-8 flex flex-col gap-6 border-t border-slate-100 pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              {ticket.status === 'OPEN' && (
                <>
                  <Button
                    onClick={() => onUpdateStatus(ticket, 'IN_PROGRESS')}
                    disabled={isActionProcessing}
                    className="px-8"
                  >
                    Assign to Tech
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setShowReject(!showReject)}
                    disabled={isActionProcessing}
                    className="px-8"
                  >
                    Reject Request
                  </Button>
                </>
              )}
              {ticket.status === 'RESOLVED' && (
                <Button
                  onClick={() => onUpdateStatus(ticket, 'CLOSED')}
                  disabled={isActionProcessing}
                  className="px-8"
                >
                  Mark as Closed
                </Button>
              {/* Chat Input Area */}
              {ticket.status !== 'CLOSED' && ticket.status !== 'REJECTED' && (
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
                        placeholder="Message the reporter..."
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
            <Button variant="outline" onClick={onClose} className="px-10">
              Dismiss View
            </Button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
          <p className="text-[10px] font-bold italic text-slate-400 tracking-tight">
            * Administrative View: Ensuring campus-wide service excellence.
          </p>
          <div />
        </div>

          {ticket.status === 'OPEN' && showReject && (
            <div className="space-y-4 rounded-3xl bg-rose-50/50 p-6 border border-rose-100 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-rose-500 text-[24px]">warning</span>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-700">Rejection Justification</p>
              </div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please state the reason for rejecting this ticket..."
                className="w-full rounded-2xl border border-rose-200 bg-white px-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-rose-500/10"
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  variant="danger"
                  onClick={onReject}
                  disabled={isActionProcessing || !rejectionReason.trim()}
                  className="px-10"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}
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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
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
    setIsActionProcessing(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (nextStatus === 'IN_PROGRESS') {
        await markAdminTicketInProgress(ticket.id)
        setSuccessMessage('Ticket assigned and marked in-progress.')

        // Notify the user about ticket assignment
        const targetUserId = ticket.userId;
        if (targetUserId) {
          try {
            await sendAdminTestNotification({
              recipientUserId: targetUserId,
              title: 'Ticket In Progress',
              message: `Your ticket "${ticket.title}" is now being handled by a technician.`,
              actionUrl: '/dashboard/user/tickets',
              category: 'TICKET'
            });
          } catch (e) { console.error(e); }
        }
      } else if (nextStatus === 'CLOSED') {
        await closeAdminTicket(ticket.id)
        setSuccessMessage('Ticket closed successfully.')

        // Notify the user about ticket closure
        const targetUserId = ticket.userId;
        if (targetUserId) {
          try {
            await sendAdminTestNotification({
              recipientUserId: targetUserId,
              title: 'Ticket Closed',
              message: `Your ticket "${ticket.title}" has been closed by an administrator.`,
              actionUrl: '/dashboard/user/tickets',
              category: 'TICKET'
            });
          } catch (e) { console.error(e); }
        }
      }

      if (selectedTicket?.id === ticket.id) {
        await loadTicketDetails(ticket.id)
      } else {
        await loadTickets()
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setProcessingId(null)
      setIsActionProcessing(false)
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
    } catch {
      setAttachmentUrls({})
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

      // Notify the user about ticket rejection
      const targetUserId = selectedTicket.userId;
      if (targetUserId) {
        try {
          await sendAdminTestNotification({
            recipientUserId: targetUserId,
            title: 'Ticket Rejected',
            message: `Your ticket "${selectedTicket.title}" has been rejected: ${rejectionReason.trim()}`,
            actionUrl: '/dashboard/user/tickets',
            category: 'TICKET'
          });
        } catch (e) { console.error(e); }
      }

      await loadTickets()
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

          <section className="mb-8 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Ticket Nexus</h2>
                <p className="mt-2 text-indigo-100/70 max-w-md font-medium">
                  Review and coordinate support requests. {stats.open} critical issues awaiting assignment.
          <section className="mb-6 rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Support Infrastructure</h2>
                <p className="mt-3 text-sm font-semibold text-slate-500 leading-relaxed">
                  Oversee all campus incidents, coordinate technician workflows, and maintain service level agreements across all departments.
                </p>
              </div>
              <Button
                onClick={loadTickets}
                className="bg-indigo-500/20 text-white border border-indigo-400/30 hover:bg-indigo-500/40 shadow-lg shadow-indigo-500/10 backdrop-blur-sm"
              >
                <span className="material-symbols-outlined mr-2">refresh</span> Sync Dispatch
              </Button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Aggregate Tickets</p>
              <h3 className="text-3xl font-black text-slate-900">{isLoading ? '—' : stats.total}</h3>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Open Issues</p>
              <h3 className="text-3xl font-black text-amber-600">{isLoading ? '—' : stats.open}</h3>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Active Labor</p>
              <h3 className="text-3xl font-black text-indigo-600">{isLoading ? '—' : stats.progress}</h3>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Status</p>
                  <div className="mt-1 flex items-center gap-2 text-emerald-600 font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Operational
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Finalized</p>
              <h3 className="text-3xl font-black text-emerald-600">{isLoading ? '—' : stats.resolved}</h3>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Tickets', val: stats.total, color: 'text-slate-900', icon: 'lists' },
              { label: 'Awaiting Action', val: stats.open, color: 'text-amber-600', icon: 'pending' },
              { label: 'In Progress', val: stats.progress, color: 'text-indigo-600', icon: 'engineering' },
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

          <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100 mb-8">
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="relative group flex-1 max-w-xl">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter by subject, reporter, or category..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-5 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
          <section className="mt-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto md:min-w-[400px]">
                <span className="material-symbols-outlined text-slate-400">search</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by ID, user, or category..."
                  className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${statusFilter === status
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
                      }`}
                    className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                      statusFilter === status
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105'
                        : 'border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {status === 'ALL' ? 'All Status' : status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="py-24 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-400">Loading infrastructure data...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                <span className="material-symbols-outlined text-slate-300 text-6xl">inventory_2</span>
                <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-400">No matching tickets found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTickets.map((ticket) => {
                  const sla = getSLADisplay(ticket.dueDate)
                  return (
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
                        {ticket.description || 'No description provided.'}
                      </p>

                      <div className="mt-auto space-y-4">
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Reporter</p>
                            <p className="text-[11px] font-bold text-slate-700 truncate">{ticket.userEmail || 'Anonymous'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Priority</p>
                            <p className={`text-[11px] font-black uppercase tracking-widest ${ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? 'text-red-600' : 'text-slate-700'
                              }`}>{ticket.priority || 'MEDIUM'}</p>
                          </div>
                        </div>

                        {sla && ticket.status === 'OPEN' && (
                          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${sla.bg} ${sla.color} ${sla.border}`}>
                            <span className="material-symbols-outlined text-[16px]">{sla.icon}</span>
                            {sla.text}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Priority:</span>
              {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setPriorityFilter(priority)}
                  className={`rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    priorityFilter === priority 
                      ? 'bg-slate-800 text-white shadow-lg' 
                      : 'border border-slate-200 bg-white text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {priority}
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
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTicket(ticket)}
                            disabled={processingId === ticket.id}
                            className="flex-1 rounded-xl bg-slate-50 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-900 hover:text-white"
                            className="rounded-xl font-black uppercase tracking-widest text-[10px]"
                          >
                            Manage Ticket
                          </button>

                          {ticket.status === 'OPEN' && (
                            <div className="flex gap-2">
                              <select
                                value={assignmentByTicket[ticket.id] || ''}
                                onChange={(e) => setAssignmentByTicket(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                className="rounded-xl border border-slate-100 bg-slate-50 px-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-100"
                              >
                                <option value="">Assign</option>
                                {technicians.map(t => (
                                  <option key={t.id} value={t.id}>{t.fullName}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssignTicket(ticket)}
                                disabled={!assignmentByTicket[ticket.id] || processingId === ticket.id}
                                className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-40"
                              >
                                <span className="material-symbols-outlined text-[18px]">done</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
                            Manage
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

      <TicketDetailsModal
        open={detailsOpen}
        ticket={selectedTicket}
        onClose={() => {
          setDetailsOpen(false)
          setSelectedTicket(null)
          setCommentText('')
          setAttachmentUrls({})
          setShowReject(false)
        }}
        onAddComment={handleAddComment}
        commentText={commentText}
        onCommentTextChange={setCommentText}
        isCommentSubmitting={isCommentSubmitting}
        attachmentUrls={attachmentUrls}
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
        onUpdateStatus={handleStatusChange}
      />
    </div>
  )
}

export default AdminTicketsPage
