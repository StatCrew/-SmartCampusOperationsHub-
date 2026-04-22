import { useState } from 'react'
import { TicketBadge, formatDateTime, isImageAttachment } from '../UserTicketsPage'

function Detail({ label, value }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">{label}</p>
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-700 font-medium">
        {value}
      </div>
    </div>
  )
}

export default function TicketDetailsModal({
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
  onRate,
  isActionProcessing,
  onDeleteComment,
  onUpdateComment,
  editingCommentId,
  setEditingCommentId,
  editingCommentText,
  setEditingCommentText,
}) {
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')

  if (!open || !ticket) {
    return null
  }

  const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : []
  const comments = Array.isArray(ticket.comments) ? ticket.comments : []

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
            {ticket.status === 'OPEN' && (
              <div className="flex items-center gap-1.5 mr-2">
                <button
                  type="button"
                  onClick={() => onEdit(ticket)}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-indigo-600 transition hover:bg-indigo-600 hover:text-white shadow-sm border border-slate-100"
                  title="Edit Ticket"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(ticket)}
                  disabled={isDeleting}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-red-600 transition hover:bg-red-600 hover:text-white shadow-sm border border-slate-100 disabled:opacity-50"
                  title="Delete Ticket"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 shadow-sm border border-slate-100"
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

            {ticket.status === 'RESOLVED' && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Resolution Notes</p>
                </div>
                <p className="text-sm text-emerald-800 font-medium leading-relaxed">{ticket.resolutionNotes || 'Problem fixed.'}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Detail label="Service Category" value={ticket.category || 'General'} />
              <Detail label="Priority Level" value={ticket.priority || 'Medium'} />
              <Detail label="Contact Number" value={ticket.contactNumber || '-'} />
              <Detail label="Target Resource ID" value={ticket.resourceId ?? 'N/A'} />
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
                  <p className="mt-2 text-sm text-slate-400 font-medium">No evidence attached to this ticket.</p>
                </div>
              )}
              {isAttachmentsLoading ? <p className="text-[10px] text-slate-400 italic">Refreshing secure access links...</p> : null}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Discussion History</p>
              <span className="text-xs font-semibold text-slate-400">{comments.length} message{comments.length === 1 ? '' : 's'}</span>
            </div>
            <div className="max-h-[480px] space-y-4 overflow-y-auto rounded-2xl bg-[#e5ddd5] p-4 no-scrollbar shadow-inner border border-slate-200">
              {comments.length > 0 ? comments.map((comment) => {
                const isMe = String(comment.userEmail || comment.createdBy || '').toLowerCase() === String(currentUserEmail || '').toLowerCase()
                const isEditing = editingCommentId === comment.id

                return (
                  <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`group relative min-w-[120px] max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
                      isMe ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                    }`}>
                      {isEditing ? (
                        <div className="space-y-2 min-w-[200px]">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white/50 p-2 text-sm text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingCommentId(null)}
                              className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => onUpdateComment(comment.id)}
                              className="text-[10px] font-bold uppercase text-indigo-600 hover:text-indigo-800"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="flex justify-between items-start gap-4">
                            <p className="text-sm leading-relaxed pb-4 pr-10">{comment.message}</p>
                            
                            {isMe && (
                              <div className="absolute top-0 right-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment.id)
                                    setEditingCommentText(comment.message)
                                  }}
                                  className="p-1 rounded-full hover:bg-black/5 text-slate-500 transition"
                                  title="Edit"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                </button>
                                <button
                                  onClick={() => onDeleteComment(comment.id)}
                                  className="p-1 rounded-full hover:bg-black/5 text-red-500 transition"
                                  title="Delete"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className="absolute bottom-0 right-0 flex items-center gap-1.5 leading-none">
                            <span className="text-[9px] text-slate-400 font-medium">{formatDateTime(comment.createdAt).split(',')[1]?.trim() || formatDateTime(comment.createdAt)}</span>
                            {isMe && <span className="material-symbols-outlined text-[14px] text-indigo-400">done_all</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    {!isMe && (
                      <div className="mt-1 flex items-center gap-1 px-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{comment.createdBy || 'Staff'}</span>
                      </div>
                    )}
                  </div>
                )
              }) : (
                <div className="rounded-xl border border-slate-200 bg-white/50 p-6 text-sm text-slate-500 text-center font-medium italic shadow-sm">
                  <span className="material-symbols-outlined block text-3xl text-slate-300 mb-2">forum</span>
                  No messages in this discussion yet.
                </div>
              )}
            </div>

            {ticket.status !== 'CLOSED' && ticket.status !== 'REJECTED' && (
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
                  placeholder="Ask for an update or provide more info..."
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
            )}
          </section>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
          <div className="flex gap-2">
            {ticket.status === 'RESOLVED' && (
              <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100 w-full lg:w-auto">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Rate this Resolution</p>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`material-symbols-outlined text-[28px] transition ${
                          star <= rating ? 'text-amber-400 fill-1 scale-110' : 'text-slate-300 hover:text-amber-200'
                        }`}
                      >
                        star
                      </button>
                    ))}
                  </div>
                  <input
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Optional feedback..."
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => onRate(rating, feedback)}
                    disabled={isActionProcessing || rating === 0}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  )
}
